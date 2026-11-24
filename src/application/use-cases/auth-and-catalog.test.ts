import {
  errorCodeOf,
  InvalidCredentialsError,
  NotAuthenticatedError,
  NotFoundError,
} from '@application/errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, PASSWORD, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';

let app: TestApp;

beforeEach(() => {
  app = createTestApp();
});

describe('authentication', () => {
  const auth = () => app.useCases.auth;

  it('signs in and exposes the user with their permissions', async () => {
    const user = await auth().signIn.execute({
      email: ' Camila@NovaEra.demo ',
      password: PASSWORD,
    });
    expect(user).toEqual({
      id: fixture.users.receptionist.id,
      name: 'Camila Rocha',
      role: 'RECEPTIONIST',
      barbershopId: fixture.shop,
      professionalId: null,
      clientId: null,
      permissions: ['agenda:manage-all', 'clients:manage'],
    });
    await expect(auth().getCurrentUser.execute()).resolves.toEqual(user);
  });

  it.each([
    ['a wrong password', 'ricardo@novaera.demo', 'nope'],
    ['an unknown e-mail', 'ninguem@novaera.demo', PASSWORD],
    ['a malformed e-mail', 'ricardo', PASSWORD],
  ])('rejects %s with the same generic error', async (_label, email, password) => {
    await expect(auth().signIn.execute({ email, password })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('has no current user before signing in, after signing out or once the session expires', async () => {
    await expect(auth().getCurrentUser.execute()).resolves.toBeNull();

    await app.signInAs('owner');
    await auth().signOut.execute();
    await expect(auth().getCurrentUser.execute()).resolves.toBeNull();

    await app.signInAs('owner');
    app.clock.set(at('20:01'));
    await expect(auth().getCurrentUser.execute()).resolves.toBeNull();
  });

  it('keeps only the user id in the stored session (LGPD)', async () => {
    await app.signInAs('owner');
    const stored = app.storage.getItem('na-regua:session') ?? '';
    expect(JSON.parse(stored)).toEqual({
      userId: fixture.users.owner.id,
      expiresAt: at('20:00').toISOString(),
    });
  });
});

describe('catalog', () => {
  beforeEach(async () => {
    await app.signInAs('owner');
  });

  it('lists active professionals by name; commission only for who manages them', async () => {
    const owners = await app.useCases.catalog.listProfessionals.execute({});
    expect(owners.map((p) => [p.name, p.commissionPercent])).toEqual([
      ['Bruno Santos', 40],
      ['Ricardo Almeida', 100],
    ]);

    await app.signInAs('receptionist');
    const receptionists = await app.useCases.catalog.listProfessionals.execute({});
    expect(receptionists.every((p) => p.commissionPercent === null)).toBe(true);
  });

  it('lists active services unless inactive ones are requested', async () => {
    const active = await app.useCases.catalog.listServices.execute({});
    expect(active.map((s) => s.name)).toEqual(['Barba', 'Corte', 'Corte + Barba']);
    expect(active.find((s) => s.kind === 'COMBO')).toMatchObject({
      durationMinutes: 60,
      priceCents: 7000,
      includedServiceIds: [fixture.haircut, 'svc-beard'],
    });

    const all = await app.useCases.catalog.listServices.execute({ includeInactive: true });
    expect(all).toHaveLength(4);
  });

  it('searches clients by name (ignoring accents) or phone, with masked contacts', async () => {
    const search = (query: string, limit?: number) =>
      app.useCases.catalog.searchClients.execute({ query, ...(limit && { limit }) });

    await expect(search('antonia')).resolves.toEqual([
      {
        id: fixture.maria,
        name: 'Maria Antônia',
        phoneMasked: '(11) *****-5678',
        emailMasked: null,
        anonymized: false,
      },
    ]);
    await expect(search('98765')).resolves.toMatchObject([
      { name: 'João Pedro', emailMasked: 'j***@email.demo' },
    ]);
    await expect(search('')).resolves.toHaveLength(2);
    await expect(search('', 1)).resolves.toHaveLength(1);
    await expect(search('zzz')).resolves.toEqual([]);
  });

  it('returns the barbershop and its cancellation policy', async () => {
    await expect(app.useCases.catalog.getBarbershop.execute()).resolves.toEqual({
      id: fixture.shop,
      name: 'Barbearia Nova Era',
      phone: '(11) 3456-7890',
      address: null,
      cancellationPolicy: { minNoticeHours: 2, noShowToleranceMinutes: 15 },
    });
  });
});

describe('errorCodeOf', () => {
  it('returns stable codes for the UI to translate', () => {
    expect(errorCodeOf(new NotFoundError('client', 'x'))).toBe('NOT_FOUND');
    expect(errorCodeOf(new NotAuthenticatedError())).toBe('NOT_AUTHENTICATED');
    expect(errorCodeOf(new InvalidValueError('phone', 'bad'))).toBe('INVALID_VALUE');
    expect(errorCodeOf(new Error('boom'))).toBe('UNEXPECTED');
  });
});
