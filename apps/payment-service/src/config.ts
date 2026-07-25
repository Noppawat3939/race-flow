export interface AppConfig {
  port: number;
  redisUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  };
}
