import { createApp } from './app';
import { loadConfig } from './config';
import { RedisStreamClient } from './stream/client';

async function bootstrap() {
  const config = loadConfig();
  const app = createApp();

  const streamClient = new RedisStreamClient(config.redisUrl);
  await streamClient.connect();

  // TODO: consume `saga.events`, drive ReserveSlot -> ChargePayment -> IssueBib
  // in order, persist progress via SagaRepository, and trigger ReleaseSlot
  // compensation on payment.failed (roadmap item: saga-orchestrator)

  app.listen(config.port, () => {
    console.log(`saga-orchestrator listening on :${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('saga-orchestrator failed to start', err);
  process.exit(1);
});
