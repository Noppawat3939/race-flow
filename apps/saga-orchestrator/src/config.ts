export interface AppConfig {
  port: number;
  redisUrl: string;
  databaseUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://race_flow:race_flow@localhost:5432/race_flow',
  };
}
