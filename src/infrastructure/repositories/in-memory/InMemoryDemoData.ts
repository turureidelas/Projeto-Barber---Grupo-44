import type { Clock } from '@application/ports/Clock';
import type { DemoDataGateway } from '@application/ports/DemoDataGateway';
import type { InMemoryDatabase } from './InMemoryDatabase';
import { createDemoSeed } from './seed/demo-seed';

export class InMemoryDemoData implements DemoDataGateway {
  private readonly db: InMemoryDatabase;
  private readonly clock: Clock;

  constructor(db: InMemoryDatabase, clock: Clock) {
    this.db = db;
    this.clock = clock;
  }

  /** Seeds only when there is nothing stored yet (first visit). */
  ensureSeeded(): void {
    if (this.db.isEmpty()) {
      this.db.replaceAll(createDemoSeed(this.clock.now()));
    }
  }

  reset(): Promise<void> {
    this.db.replaceAll(createDemoSeed(this.clock.now()));
    return Promise.resolve();
  }
}
