import { SagaRepository } from './saga.repository';

// TODO: drive RegisterRunnerSaga end-to-end — issue ReserveSlot -> ChargePayment
// -> IssueBib in order, react to saga.events, apply a per-step timeout, and
// trigger ReleaseSlot compensation on payment.failed (roadmap item:
// saga-orchestrator).
export class SagaOrchestratorService {
  constructor(private readonly repository: SagaRepository) {}

  async startRegisterRunnerSaga(_raceId: string, _userId: string): Promise<never> {
    throw new Error('not implemented');
  }

  async handleEvent(_event: { type: string; sagaId: string }): Promise<void> {
    throw new Error('not implemented');
  }
}
