export interface AppConfig {
  port: number;
  redisUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3002),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  };
}
