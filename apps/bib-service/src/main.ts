import { createApp } from './app';
import { loadConfig } from './config';
import { RedisStreamClient } from './stream/client';

async function bootstrap() {
  const config = loadConfig();
  const app = createApp();

  const streamClient = new RedisStreamClient(config.redisUrl);
  await streamClient.connect();

  // TODO: consume `IssueBib` from `bib-service.commands` (roadmap item: bib-service)

  app.listen(config.port, () => {
    console.log(`bib-service listening on :${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('bib-service failed to start', err);
  process.exit(1);
});
