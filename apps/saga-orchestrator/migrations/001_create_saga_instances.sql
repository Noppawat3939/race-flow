-- Schema from docs/queue-protocol.md § Saga state
CREATE TABLE IF NOT EXISTS saga_instances (
  saga_id       uuid PRIMARY KEY,
  state         text NOT NULL,
  race_id       uuid NOT NULL,
  user_id       uuid NOT NULL,
  current_step  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
