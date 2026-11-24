import { at } from '@domain/testing/builders';
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from '@infrastructure/repositories/in-memory/seed/demo-catalog';
import { errorCodeOf, InvalidCredentialsError, NotFoundError } from '@application/errors';
import { createDemoSeed } from '@infrastructure/repositories/in-memory/seed/demo-seed';
import { MemoryStorage } from '@infrastructure/storage/KeyValueStorage';
import { describe, expect, it } from 'vitest';
import { createContainer } from './container';
import { FixedClock } from './testing/createTestApp';
import { createFakeApi } from './testing/fakeApi';

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

  it('offers the demo accounts for one-tap sign-in', async () => {
    const accounts = await boot().useCases.demo?.listAccounts.execute();
    expect(accounts?.map((account) => account.role)).toEqual([
      'OWNER',
      'PROFESSIONAL',
      'PROFESSIONAL',
      'RECEPTIONIST',
      'CLIENT',
    ]);
    expect(accounts?.every((account) => account.password === DEMO_PASSWORD)).toBe(true);
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
});

describe('createContainer (API mode)', () => {
  const API_URL = 'https://api.novaera.test/api';
  const clock = () => new FixedClock(at('10:20'));

  function bootApi(storage = new MemoryStorage()) {
    const time = clock();
    const api = createFakeApi(createDemoSeed(time.now()), () => time.now());
    const container = createContainer({
      env: { apiUrl: API_URL, useMocks: false },
      storage,
      clock: time,
      fetch: api.fetch,
    });
    return { ...container, api, storage };
  }

  it('runs the same use cases over HTTP, with no demo tools', async () => {
    const { useCases, api, storage } = bootApi();
    expect(useCases.demo).toBeNull();

    const user = await useCases.auth.signIn.execute({
      email: 'ricardo@novaera.demo',
      password: DEMO_PASSWORD,
    });
    expect(user.role).toBe('OWNER');
    // LGPD: the browser keeps only the user ID, the expiry and the opaque token.
    expect(Object.keys(JSON.parse(storage.getItem('na-regua:session') ?? '{}') as object)).toEqual([
      'userId',
      'expiresAt',
      'token',
    ]);

    const agenda = await useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    expect(agenda.professionals).toHaveLength(3);
    expect(agenda.appointments.length).toBeGreaterThan(10);

    const [client] = await useCases.catalog.searchClients.execute({ query: 'a', limit: 1 });
    if (!client) throw new Error('expected demo clients');
    const details = await useCases.catalog.getClientDetails.execute({ clientId: client.id });
    expect(details.phone).toMatch(/^\(\d{2}\) /);

    const [slot] = await useCases.agenda.listAvailableSlots.execute({
      professionalId: agenda.professionals[0]?.id ?? '',
      serviceId: 'svc-corte',
      date: '2026-11-20',
    });
    if (!slot) throw new Error('expected a free slot');
    const booked = await useCases.agenda.scheduleAppointment.execute({
      professionalId: agenda.professionals[0]?.id ?? '',
      clientId: client.id,
      serviceId: 'svc-corte',
      start: slot.start,
    });
    expect(booked.clientName).toBe(client.name);

    const notices = await useCases.notifications.list.execute();
    expect(notices.unreadCount).toBe(3);
    await useCases.notifications.markAllRead.execute();
    await expect(useCases.notifications.list.execute()).resolves.toMatchObject({ unreadCount: 0 });
    await useCases.reports.getReport.execute({ from: '2026-11-16', to: '2026-11-18' });

    // No e-mail, phone or search text ever travels in a URL.
    expect(api.urls.length).toBeGreaterThan(10);
    for (const url of api.urls) {
      expect(url).not.toMatch(/@|novaera\.demo|\d{8,}/);
      expect(url.startsWith(API_URL)).toBe(true);
    }

    await useCases.auth.signOut.execute();
    await expect(useCases.auth.getCurrentUser.execute()).resolves.toBeNull();
  });

  it('saves cadastros, settings and blocked times through the API', async () => {
    const { useCases, api } = bootApi();
    await useCases.auth.signIn.execute({ email: 'ricardo@novaera.demo', password: DEMO_PASSWORD });

    await useCases.settings.updateBarbershop.execute({
      name: 'Nova Era',
      phone: '(11) 3456-7890',
      address: null,
    });
    await expect(useCases.catalog.getBarbershop.execute()).resolves.toMatchObject({
      name: 'Nova Era',
    });

    const client = await useCases.catalog.createClient.execute({
      name: 'Cliente Novo',
      phone: '(11) 97777-0000',
      email: null,
      consentGiven: true,
    });
    await expect(
      useCases.catalog.createClient.execute({
        name: 'Repetido',
        phone: '(11) 97777-0000',
        email: null,
        consentGiven: true,
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
    await useCases.catalog.anonymizeClient.execute({ clientId: client.id });

    const [service] = await useCases.catalog.listServices.execute({});
    if (!service) throw new Error('expected services');
    await useCases.catalog.updateService.execute({
      serviceId: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents + 500,
      includedServiceIds: [...service.includedServiceIds],
    });
    await useCases.catalog.updateProfessional.execute({
      professionalId: 'pro-bruno',
      name: 'Bruno Santos',
      specialty: null,
      photoUrl: null,
      commissionPercent: 45,
    });

    const block = await useCases.agenda.blockTime.execute({
      professionalId: 'pro-bruno',
      start: at('09:00', '2026-11-27').toISOString(),
      end: at('10:00', '2026-11-27').toISOString(),
      reason: null,
    });
    await useCases.agenda.unblockTime.execute({ timeBlockId: block.id });
    await expect(useCases.agenda.unblockTime.execute({ timeBlockId: block.id })).rejects.toThrow(
      NotFoundError,
    );
    for (const url of api.urls) {
      expect(url).not.toMatch(/97777|Cliente/);
    }
  });

  it('shows the API business errors with the usual messages', async () => {
    const { useCases, api } = bootApi();
    await expect(
      useCases.auth.signIn.execute({ email: 'ricardo@novaera.demo', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);

    await useCases.auth.signIn.execute({ email: 'ricardo@novaera.demo', password: DEMO_PASSWORD });
    api.failNext('/api/barbershops/shop-nova-era', 503, '<html>down</html>');
    const outage = await useCases.catalog.getBarbershop.execute().catch((error: unknown) => error);
    expect(errorCodeOf(outage)).toBe('UNEXPECTED');

    api.failNext('/api/barbershops/shop-nova-era', 401, {});
    const expired = await useCases.catalog.getBarbershop.execute().catch((error: unknown) => error);
    expect(errorCodeOf(expired)).toBe('NOT_AUTHENTICATED');
  });
});
