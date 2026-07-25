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
      console.log('bib-service: connected to redis');
    } catch (err) {
      console.warn('bib-service: redis not reachable yet:', (err as Error).message);
    }
  }

  // TODO: XADD an event envelope onto `stream` (roadmap item: bib-service).
  async publish(_stream: string, _event: EventEnvelope): Promise<void> {
    throw new Error('not implemented');
  }

  // TODO: XREADGROUP + ack/retry/dead-letter per docs/queue-protocol.md
  // (roadmap item: bib-service).
  async consume(_stream: string, _group: string, _consumer: string): Promise<CommandEnvelope[]> {
    throw new Error('not implemented');
  }

  async close(): Promise<void> {
    this.redis.disconnect();
  }
}
