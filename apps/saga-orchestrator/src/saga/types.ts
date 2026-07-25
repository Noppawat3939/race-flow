// Mirrors the `saga_instances` schema in docs/queue-protocol.md.
export type SagaState =
  | 'RESERVING'
  | 'CHARGING'
  | 'ISSUING_BIB'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'FAILED';

export interface SagaInstance {
  sagaId: string;
  state: SagaState;
  raceId: string;
  userId: string;
  currentStep: string;
  createdAt: Date;
  updatedAt: Date;
}
