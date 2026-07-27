# order-service

Go service responsible for **reserving a race slot atomically** — the concurrency-heavy piece of the [race-flow](../../README.md) system, and the reason this service is written in Go instead of Node like the rest of the stack.

## Responsibility

Given a `raceId` and `userId`, reserve one slot for that race without ever overselling — even when many reservation requests for the same race arrive concurrently. This is a genuine race-condition problem (pun intended), not CRUD, which is why it's the piece singled out for Go.

On success/failure it reports back to `saga-orchestrator` by publishing an event. It never talks to `payment-service` or `bib-service` directly — every interaction goes through the orchestrator over Redis Streams, per [`docs/queue-protocol.md`](../../docs/queue-protocol.md).

## Where it fits in the saga

```
saga-orchestrator --ReserveSlot--> order-service --order.reserved--------> saga-orchestrator
                                                  --order.reservation-failed-> saga-orchestrator

saga-orchestrator --ReleaseSlot--> order-service --order.released---------> saga-orchestrator
```

`ReserveSlot` is always the **first** command issued in `RegisterRunnerSaga`. `ReleaseSlot` is the **compensation** step, issued only if a later step (`payment-service`) fails.

## Message contract

This service implements one corner of the shared envelope contract — full details in [`docs/queue-protocol.md`](../../docs/queue-protocol.md).

| Message | Kind | Direction | Stream | Payload |
|---|---|---|---|---|
| `ReserveSlot` | command | consumes | `order-service.commands` | `{ raceId, userId }` |
| `ReleaseSlot` | command | consumes | `order-service.commands` | `{ raceId, userId, reason }` |
| `order.reserved` | event | publishes | `saga.events` | `{ raceId, userId, slotId }` |
| `order.reservation-failed` | event | publishes | `saga.events` | `{ raceId, userId, reason }` |
| `order.released` | event | publishes | `saga.events` | `{ raceId, userId }` |

Every command carries a `sagaId` (correlates the reply to the right in-flight registration) and a `commandId` (the idempotency key — see below).

## Definition of done

What "finished" means for this service — copied from the [root README](../../README.md#goals-per-service-definition-of-done) so it stays next to the code it applies to:

- [ ] Slot count never goes negative or over-allocates under concurrent requests (proven with a concurrency test, not just manual checking)
- [ ] Consumes `ReserveSlot` / `ReleaseSlot` from `order-service.commands`
- [ ] Publishes `order.reserved` / `order.reservation-failed` / `order.released` to `saga.events`
- [ ] Idempotent — replaying the same `commandId` never double-reserves or double-releases a slot
- [ ] Unit tests cover the atomic reservation logic in isolation
- [ ] Survives a K6 "registration rush" test (e.g. 1000 concurrent reservations against 100 slots) and ends with the correct slot count

## Current state (scaffold only)

Nothing below is implemented yet — every path returns `ErrNotImplemented`. This is intentional groundwork, not a bug:

- `cmd/main.go` — boots config, opens a Redis client, pings it, logs and exits. No consumer loop yet.
- `internal/config/` — env var loading (`REDIS_ADDR`, `CONSUMER_GROUP`, `COMMANDS_STREAM`, `EVENTS_STREAM`), already done.
- `internal/reservation/` — `Store` interface (`Reserve` / `Release`) with a `memoryStore` stub. **This is the core implementation task**: make it atomic and idempotent under concurrency.
- `internal/stream/` — `Client` with `Command`/`Event` envelope structs matching the queue protocol, plus `Publish`/`Consume` stubs. Needs XADD (publish), XREADGROUP/XACK (consume), retry/dead-letter handling per the protocol doc.

### Implementation order (suggested)

1. Make `reservation.Store` atomic and idempotent (in-memory first, e.g. a per-race slot counter guarded correctly for concurrent access + a `commandId` dedupe map) — provable with a Go concurrency test (`go test -race`) before touching Redis at all.
2. Implement `stream.Client.Consume` — `XREADGROUP` on `order-service.commands`, decode into `Command`.
3. Wire `cmd/main.go` into a real consumer loop: consume → dedupe by `commandId` → call `Store.Reserve`/`Release` → `Publish` the resulting event → `XACK`.
4. Implement `stream.Client.Publish` — `XADD` onto `saga.events`.
5. Add retry/dead-letter handling (`XAUTOCLAIM` reclaimer, `MAX_RETRIES` → `<stream>.dead-letter`) per the protocol doc.
6. K6 load test: 1000 concurrent reservations against 100 slots, assert the final slot count is exactly 0 remaining / 100 reserved.

## Project structure

```
order-service/
├── cmd/
│   └── main.go          # entrypoint — currently just pings Redis and logs
├── internal/
│   ├── config/          # env var loading
│   ├── reservation/      # atomic slot reservation (Store interface) — core task
│   └── stream/           # Redis Streams producer/consumer (Client) — core task
├── go.mod
├── go.sum
└── Dockerfile
```

## Configuration

Read from the environment, with fallbacks (see `internal/config/config.go`):

| Var | Default | Purpose |
|---|---|---|
| `REDIS_ADDR` | `localhost:6379` | Redis Streams connection |
| `CONSUMER_GROUP` | `order-service-group` | Redis consumer group name for `XREADGROUP` |
| `COMMANDS_STREAM` | `order-service.commands` | Stream this service consumes |
| `EVENTS_STREAM` | `saga.events` | Stream this service publishes to |

Copy the repo root's [`.env.example`](../../.env.example) to `.env` — this service only reads `REDIS_ADDR` and `ORDER_SERVICE_CONSUMER_GROUP` out of it.

## Local development

Redis must be running (`docker compose up redis` from the repo root, or a local install).

```bash
cd apps/order-service
go run ./cmd
```

Build / vet / test:

```bash
go build ./...
go vet ./...
go test ./...
go test -race ./...   # required once reservation logic is concurrent — proves no data races
```

Run as part of the full stack:

```bash
# from repo root
docker compose up --build
```

## Non-goals

Same as the [project-level non-goals](../../README.md#non-goals): no real payment/BIB integration here — this service only owns slot reservation. Not comparing Redis Streams against other brokers.
