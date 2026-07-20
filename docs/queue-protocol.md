# Queue Protocol

The shared contract every service (Go and Node alike) must implement to talk over the event bus. This is what makes the system polyglot: no shared code library, just an agreed-upon wire format.

## Transport

**Redis Streams.** Two kinds of streams:

| Stream naming | Direction | Example |
|---|---|---|
| `<service>.commands` | `saga-orchestrator` → one specific service | `order-service.commands` |
| `saga.events` | any service → `saga-orchestrator` (and anyone else listening) | `saga.events` |

Commands are addressed to exactly one service (its own stream). Events are broadcast on a single shared stream and consumers filter by `type`.

Each consumer reads its stream via a **Redis consumer group** (`XREADGROUP`) scoped to that service, e.g. group `payment-service-group` on `payment-service.commands`. This gives at-least-once delivery, per-consumer offset tracking, and the ability to reclaim messages a crashed consumer never acked.

## Envelope

### Command envelope

```json
{
  "commandId": "3f1a2e9e-...-uuid",
  "command": "ReserveSlot",
  "sagaId": "b7c4d1a0-...-uuid",
  "issuedAt": "2026-07-20T09:15:00.000Z",
  "version": "1.0",
  "payload": { }
}
```

### Event envelope

```json
{
  "eventId": "9d2f6b3c-...-uuid",
  "type": "order.reserved",
  "sagaId": "b7c4d1a0-...-uuid",
  "occurredAt": "2026-07-20T09:15:00.250Z",
  "version": "1.0",
  "payload": { }
}
```

`sagaId` is mandatory on every message. It is how `saga-orchestrator` correlates a reply back to the saga instance that triggered it — without it, the orchestrator cannot know which in-flight registration a message belongs to.

## Command & event catalog

| Message | Kind | Producer | Consumer(s) | Stream | Payload |
|---|---|---|---|---|---|
| `ReserveSlot` | command | saga-orchestrator | order-service | `order-service.commands` | `{ raceId, userId }` |
| `order.reserved` | event | order-service | saga-orchestrator | `saga.events` | `{ raceId, userId, slotId }` |
| `order.reservation-failed` | event | order-service | saga-orchestrator | `saga.events` | `{ raceId, userId, reason }` |
| `ReleaseSlot` | command | saga-orchestrator | order-service | `order-service.commands` | `{ raceId, userId, reason }` |
| `order.released` | event | order-service | saga-orchestrator | `saga.events` | `{ raceId, userId }` |
| `ChargePayment` | command | saga-orchestrator | payment-service | `payment-service.commands` | `{ userId, raceId, amount }` |
| `payment.succeeded` | event | payment-service | saga-orchestrator | `saga.events` | `{ userId, raceId, transactionId }` |
| `payment.failed` | event | payment-service | saga-orchestrator | `saga.events` | `{ userId, raceId, reason }` |
| `IssueBib` | command | saga-orchestrator | bib-service | `bib-service.commands` | `{ userId, raceId }` |
| `bib.issued` | event | bib-service | saga-orchestrator | `saga.events` | `{ userId, raceId, bibNumber }` |

## Idempotency

Consumer groups give **at-least-once** delivery — a consumer that crashes after processing but before `XACK` will see the same message again. Every consumer must therefore:

1. Extract `commandId` (or `eventId`) from the envelope.
2. Check it against a dedupe store (e.g. `SETNX processed:<id>` with a TTL of a few days) before doing anything with side effects.
3. If already seen, `XACK` immediately and skip processing.

This is the same idempotency-key idea used for the payment webhook example discussed earlier — applied here to every message, not just payments.

## Retry & dead-letter

1. Consumer reads pending entries via `XREADGROUP`.
2. On success: `XACK`.
3. On handler failure: do **not** ack. A periodic reclaimer process runs `XAUTOCLAIM` for entries idle longer than `RETRY_IDLE_MS` (e.g. 30s) and hands them back to a worker.
4. Track delivery count per message (Redis Streams expose delivery count via `XPENDING`). Once it exceeds `MAX_RETRIES` (e.g. 3), publish the raw entry to `<stream>.dead-letter` and `XACK` the original so it stops being redelivered.
5. `<stream>.dead-letter` is inspected manually during development — no auto-recovery for this project.

## Saga state

`saga-orchestrator` persists saga progress in Postgres so it survives restarts:

```
saga_instances
  saga_id       uuid primary key
  state         text   -- e.g. RESERVING, CHARGING, ISSUING_BIB, COMPLETED, COMPENSATING, FAILED
  race_id       uuid
  user_id       uuid
  current_step  text
  created_at    timestamptz
  updated_at    timestamptz
```

Every command the orchestrator issues and every event it consumes updates this row before moving to the next step.

## Versioning

`version` on every envelope is a plain string (`"1.0"`). No compatibility handling is planned for this project — it exists so a future breaking payload change has somewhere to signal from, not because this project needs to support multiple versions at once.
