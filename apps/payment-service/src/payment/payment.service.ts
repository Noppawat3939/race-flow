// TODO: charge the runner exactly-once (idempotent by commandId), simulate a
// realistic failure rate, and publish payment.succeeded / payment.failed
// (roadmap item: payment-service).
export class PaymentService {
  async charge(_userId: string, _raceId: string, _amount: number, _commandId: string): Promise<never> {
    throw new Error('not implemented');
  }
}
