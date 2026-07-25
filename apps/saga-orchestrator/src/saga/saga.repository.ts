import { Pool } from 'pg';
import { SagaInstance, SagaState } from './types';

// TODO: persist/read saga_instances rows (see migrations/001_create_saga_instances.sql)
// so the orchestrator can resume every in-flight saga after a restart
// (roadmap item: saga-orchestrator).
export class SagaRepository {
  constructor(private readonly pool: Pool) {}

  async create(_sagaId: string, _raceId: string, _userId: string): Promise<SagaInstance> {
    throw new Error('not implemented');
  }

  async updateState(_sagaId: string, _state: SagaState, _currentStep: string): Promise<void> {
    throw new Error('not implemented');
  }

  async findById(_sagaId: string): Promise<SagaInstance | null> {
    throw new Error('not implemented');
  }

  async findInFlight(): Promise<SagaInstance[]> {
    throw new Error('not implemented');
  }
}
