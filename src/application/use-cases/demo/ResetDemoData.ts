import type { DemoAccount, DemoDataGateway } from '../../ports/DemoDataGateway';
import type { UseCase } from '../UseCase';

/** "Resetar dados de demonstração" — only exists when running with mocks. */
export class ResetDemoData implements UseCase<void, void> {
  private readonly demoData: DemoDataGateway;

  constructor(demoData: DemoDataGateway) {
    this.demoData = demoData;
  }

  execute(): Promise<void> {
    return this.demoData.reset();
  }
}

/** Demo accounts for one-tap sign-in (fictional data, demo mode only). */
export class ListDemoAccounts implements UseCase<void, DemoAccount[]> {
  private readonly demoData: DemoDataGateway;

  constructor(demoData: DemoDataGateway) {
    this.demoData = demoData;
  }

  execute(): Promise<DemoAccount[]> {
    return this.demoData.listAccounts();
  }
}
