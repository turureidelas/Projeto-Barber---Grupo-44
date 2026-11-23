import type { Clock } from '@application/ports/Clock';
import type { DemoAccount, DemoDataGateway } from '@application/ports/DemoDataGateway';
import type { InMemoryDatabase } from './InMemoryDatabase';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './seed/demo-catalog';
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

  listAccounts(): Promise<DemoAccount[]> {
    return Promise.resolve(
      DEMO_ACCOUNTS.map(({ name, email, role }) => ({
        name,
        email,
        role,
        password: DEMO_PASSWORD,
      })),
    );
  }
}
