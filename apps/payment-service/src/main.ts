import { createApp } from './app';
import { loadConfig } from './config';
import { RedisStreamClient } from './stream/client';

async function bootstrap() {
  const config = loadConfig();
  const app = createApp();

  const streamClient = new RedisStreamClient(config.redisUrl);
  await streamClient.connect();

  // TODO: consume `ChargePayment` from `payment-service.commands` (roadmap item: payment-service)

  app.listen(config.port, () => {
    console.log(`payment-service listening on :${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('payment-service failed to start', err);
  process.exit(1);
});
