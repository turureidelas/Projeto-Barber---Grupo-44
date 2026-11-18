import { at } from '@domain/testing/builders';
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from '@infrastructure/repositories/in-memory/seed/demo-catalog';
import { MemoryStorage } from '@infrastructure/storage/KeyValueStorage';
import { describe, expect, it } from 'vitest';
import { createContainer } from './container';
import { FixedClock } from './testing/createTestApp';

const env = { apiUrl: '', useMocks: true };

function boot(storage = new MemoryStorage()) {
  return createContainer({ env, storage, clock: new FixedClock(at('10:20')) });
}

describe('createContainer (mock mode)', () => {
  it('seeds the demo data on first run so every demo account can sign in', async () => {
    const { useCases } = boot();
    for (const account of DEMO_ACCOUNTS) {
      const user = await useCases.auth.signIn.execute({
        email: account.email,
        password: DEMO_PASSWORD,
      });
      expect(user.role).toBe(account.role);
    }
  });

  it('shows a lively agenda for today', async () => {
    const { useCases } = boot();
    await useCases.auth.signIn.execute({ email: 'ricardo@novaera.demo', password: DEMO_PASSWORD });
    const agenda = await useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    expect(agenda.professionals).toHaveLength(3);
    expect(agenda.appointments.length).toBeGreaterThan(10);
    expect(agenda.next).not.toBeNull();
    expect(agenda.summary.revenueCents).toBeGreaterThan(0);
  });

  it('keeps changes across reloads and can reset the demo', async () => {
    const storage = new MemoryStorage();
    const first = boot(storage);
    await first.useCases.auth.signIn.execute({
      email: 'ricardo@novaera.demo',
      password: DEMO_PASSWORD,
    });
    const before = await first.useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    const target = before.timeBlocks[0];
    if (!target) throw new Error('expected a demo time block today');
    await first.useCases.agenda.unblockTime.execute({ timeBlockId: target.id });

    const second = boot(storage);
    const after = await second.useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    expect(after.timeBlocks).toHaveLength(before.timeBlocks.length - 1);

    await second.useCases.demo?.resetDemoData.execute();
    const reset = await second.useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    expect(reset.timeBlocks).toHaveLength(before.timeBlocks.length);
  });

  it('refuses to start against the API until the HTTP adapters exist', () => {
    expect(() =>
      createContainer({
        env: { apiUrl: 'http://localhost:3333', useMocks: false },
        storage: new MemoryStorage(),
      }),
    ).toThrow(/VITE_USE_MOCKS/);
  });
});
