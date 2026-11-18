import type { DemoDataGateway } from '../../ports/DemoDataGateway';
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
