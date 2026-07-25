# race-flow

A polyglot microservices practice project simulating a race (marathon) registration system. Built to go deep on backend engineering concepts beyond CRUD: a hand-rolled job queue, the Saga pattern for distributed transactions, and Go for the concurrency-heavy piece of the system.

## Domain

Registering a runner for a race involves three things that must stay consistent even though they happen in separate services: reserving a limited slot, taking payment, and issuing a BIB number. Instead of one database transaction, this is coordinated across independent services with explicit compensation on failure (Saga), communicating over a queue built from scratch.

## Why this project

- Build a job queue from scratch (not BullMQ/Sidekiq) to actually understand retry, dead-letter handling, and delivery guarantees instead of treating it as a black box.
- Practice the Saga pattern (orchestration style) for distributed transactions across services.
- Practice Go specifically where it earns its keep: the slot-reservation logic, which is a genuine concurrency/race-condition problem.
- Practice designing a language-agnostic message contract, since services are intentionally polyglot.

## Architecture

```
                     ┌────────────────────┐
                     │  saga-orchestrator │  (Node/Express)
                     └─────────┬──────────┘
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
     ┌───────────────┐  ┌────────────────┐  ┌───────────────┐
     │ order-service │  │ payment-service│  │  bib-service  │
     │     (Go)      │  │  (Node/Express) │  │ (Node/Express) │
     └───────┬───────┘  └────────┬───────┘  └───────┬───────┘
             └───────────────────┴──────────────────┘
                                 │
                          Redis Streams
                       (shared event bus)
```

## Project structure

```
race-flow/
├── README.md
├── docs/
│   └── queue-protocol.md
├── docker-compose.yml
├── .env.example
└── apps/
    ├── order-service/            # Go
    │   ├── cmd/
    │   │   └── main.go
    │   ├── internal/
    │   │   ├── reservation/      # atomic slot reservation logic
    │   │   ├── stream/           # Redis Streams producer/consumer
    │   │   └── config/
    │   ├── go.mod
    │   └── go.sum
    │
    ├── payment-service/          # Node/Express
    │   ├── src/
    │   │   ├── payment/
    │   │   ├── stream/           # Redis Streams producer/consumer
    │   │   └── main.ts
    │   ├── test/
    │   └── package.json
    │
    ├── bib-service/               # Node/Express
    │   ├── src/
    │   │   ├── bib/
    │   │   ├── stream/
    │   │   └── main.ts
    │   ├── test/
    │   └── package.json
    │
    └── saga-orchestrator/         # Node/Express
        ├── src/
        │   ├── saga/              # state machine + saga_instances repository
        │   ├── stream/
        │   └── main.ts
        ├── test/
        └── package.json
```

Each service under `apps/` is independently runnable and deployable — no shared code package between them, only the shared contract in `docs/queue-protocol.md`.

## Services

| Service | Stack | Responsibility |
|---|---|---|
| `order-service` | Go | Reserve a race slot atomically (handles the race-condition problem directly), publishes `order.reserved` |
| `payment-service` | Node/Express | Charges the runner, publishes `payment.succeeded` / `payment.failed` |
| `bib-service` | Node/Express | Issues a BIB number once payment succeeds |
| `saga-orchestrator` | Node/Express | Drives the registration flow end-to-end, triggers compensation on failure |

## Messaging

Services communicate over **Redis Streams** using a shared JSON event contract (to be documented in `docs/queue-protocol.md`). Redis Streams was picked over RabbitMQ/Kafka deliberately — Redis is already familiar, so the learning stays focused on queue/saga concepts instead of new infra.

## Saga flow — happy path

1. `saga-orchestrator` starts `RegisterRunnerSaga`
2. → `order-service`: reserve slot → emits `order.reserved`
3. → `payment-service`: charge runner → emits `payment.succeeded`
4. → `bib-service`: issue BIB → emits `bib.issued`
5. Saga completes

## Saga flow — compensation (failure path)

If `payment-service` emits `payment.failed`:
- `saga-orchestrator` tells `order-service` to release the reserved slot → emits `order.released`

## Goals per service (definition of done)

What "finished" means for each service — used to check progress against, not just "code exists."

### `order-service` (Go)

Goal: reserve a race slot atomically without overselling, even under heavy concurrent load.

- [ ] Slot count never goes negative or over-allocates under concurrent requests (proven with a concurrency test, not just manual checking)
- [ ] Consumes `ReserveSlot` / `ReleaseSlot` from `order-service.commands`
- [ ] Publishes `order.reserved` / `order.reservation-failed` / `order.released` to `saga.events`
- [ ] Idempotent — replaying the same `commandId` never double-reserves or double-releases a slot
- [ ] Unit tests cover the atomic reservation logic in isolation
- [ ] Survives a K6 "registration rush" test (e.g. 1000 concurrent reservations against 100 slots) and ends with the correct slot count

### `payment-service` (Node/Express)

Goal: charge a runner exactly-once from the caller's perspective, including on retry.

- [ ] Consumes `ChargePayment` from `payment-service.commands`
- [ ] Idempotent charge — a retried command with the same `commandId` never charges twice
- [ ] Publishes `payment.succeeded` / `payment.failed` to `saga.events`
- [ ] Simulates realistic failure (random failure rate or timeout) so the saga's compensation path is actually exercised, not just the happy path
- [ ] Integration tests cover both the success and failure path

### `bib-service` (Node/Express)

Goal: issue a unique BIB number once, only after payment is confirmed.

- [ ] Consumes `IssueBib` from `bib-service.commands`
- [ ] BIB numbers are unique per race — no duplicates under concurrent issuance
- [ ] Idempotent issuance — replay never issues a second BIB for the same user/race
- [ ] Publishes `bib.issued` to `saga.events`
- [ ] Test verifies uniqueness under concurrent issuance

### `saga-orchestrator` (Node/Express)

Goal: drive every registration to either full completion or full compensation — no saga left stuck in an inconsistent state.

- [ ] Persists saga state in `saga_instances` and survives an orchestrator restart mid-saga
- [ ] Issues commands in the correct order: `ReserveSlot` → `ChargePayment` → `IssueBib`
- [ ] On `payment.failed`, correctly issues `ReleaseSlot` (compensation) and marks the saga `FAILED`
- [ ] Ignores duplicate or out-of-order events safely (matches on `sagaId`, ignores events for sagas already `COMPLETED`/`FAILED`)
- [ ] Has a timeout per step — no reply within N seconds is treated as a failure and triggers compensation
- [ ] Integration tests cover: happy path, payment-failure/compensation path, and crash-mid-saga-then-restart

### Whole project

- [ ] End-to-end happy path demo: register → pay → BIB issued
- [ ] End-to-end failure demo: payment fails → slot is released, saga ends `FAILED`
- [ ] K6 load test results for the registration rush scenario documented somewhere in the repo

## Roadmap

- [ ] `docs/queue-protocol.md` — define the shared event schema used by every service
- [ ] `order-service` (Go) — atomic slot reservation + Redis Streams producer, with its own unit tests
- [ ] `payment-service` (Node) — consumes `order.reserved`, mocks a payment charge, publishes the result
- [ ] `bib-service` (Node) — consumes `payment.succeeded`, issues a BIB number
- [ ] `saga-orchestrator` (Node) — state machine driving the flow + compensation logic
- [ ] Load test the registration flow with K6 (simulate a registration rush)
- [ ] `docker-compose.yml` to run all services + Redis locally

## Local development

Copy `.env.example` to `.env` (each service reads the vars relevant to it) and either run everything together or one service at a time.

**All services + Redis + Postgres:**

```bash
docker compose up --build
```

**One service at a time** (Redis, and Postgres for `saga-orchestrator`, must be running — `docker compose up redis postgres` or a local install):

```bash
# order-service (Go)
cd apps/order-service && go run ./cmd

# payment-service / bib-service / saga-orchestrator (Node/Express)
cd apps/payment-service && yarn && yarn dev
```

Each service also has its own build/test commands: `go build ./...` / `go vet ./...` for `order-service`, `yarn build` + `yarn test` for the Node services (Yarn 4, `node-modules` linker).

## Non-goals

- Not a production system — no real payment gateway, no auth, no real BIB printing/hardware.
- Not evaluating message brokers — Redis Streams only, by design, to stay focused on the queue/saga concepts rather than broker comparison.
