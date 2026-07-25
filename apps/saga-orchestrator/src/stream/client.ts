// Redis Streams producer/consumer wrapper implementing the envelope shape
// defined in docs/queue-protocol.md — the shared wire contract every
// service talks over.
import Redis from 'ioredis';

export interface CommandEnvelope<T = Record<string, unknown>> {
  commandId: string;
  command: string;
  sagaId: string;
  issuedAt: string;
  version: string;
  payload: T;
}

export interface EventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  type: string;
  sagaId: string;
  occurredAt: string;
  version: string;
  payload: T;
}

export class RedisStreamClient {
  private readonly redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, { lazyConnect: true, retryStrategy: () => null });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      await this.redis.ping();
      console.log('saga-orchestrator: connected to redis');
    } catch (err) {
      console.warn('saga-orchestrator: redis not reachable yet:', (err as Error).message);
    }
  }

  // TODO: XADD an event envelope onto `stream` (roadmap item: saga-orchestrator).
  async publish(_stream: string, _event: EventEnvelope): Promise<void> {
    throw new Error('not implemented');
  }

  // TODO: XREADGROUP + ack/retry/dead-letter per docs/queue-protocol.md
  // (roadmap item: saga-orchestrator).
  async consume(_stream: string, _group: string, _consumer: string): Promise<CommandEnvelope[]> {
    throw new Error('not implemented');
  }

  async close(): Promise<void> {
    this.redis.disconnect();
  }
}
