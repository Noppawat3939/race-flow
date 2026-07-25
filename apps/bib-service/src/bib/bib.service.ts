// TODO: issue a unique BIB number per race, idempotent by commandId/userId so
// a replay never issues a second BIB, and publish bib.issued (roadmap item:
// bib-service).
export class BibService {
  async issue(_userId: string, _raceId: string, _commandId: string): Promise<never> {
    throw new Error('not implemented');
  }
}
