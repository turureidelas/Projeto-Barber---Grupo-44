import { AlreadyExistsError, NotFoundError } from '@application/errors';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { LateChangeNotAllowedError } from '@domain/errors/appointment-errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { ScheduleConflictError } from '@domain/errors/scheduling-errors';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type Persona, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH } from './client-account';

/** Wednesday 2026-11-18, 08:00. Default policy: 2h notice. João has a client account. */
let app: TestApp;
const iso = (time: string) => at(time).toISOString();
const client = () => app.useCases.client;

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('client');
});

async function as(persona: Persona) {
  await app.useCases.auth.signOut.execute();
  await app.signInAs(persona);
}

function bookHaircut(start: string, professionalId: string = fixture.bruno) {
  return client().book.execute({ professionalId, serviceId: fixture.haircut, start: iso(start) });
}

const newAccount = {
  barbershopId: fixture.shop,
  name: ' Ana Clara ',
  phone: '(11) 97777-1234',
  email: 'ana@email.demo',
  password: 'segredo1',
  consentGiven: true,
};

describe('client account', () => {
  beforeEach(async () => {
    await app.useCases.auth.signOut.execute();
  });

  it('lists the barbershops without a session', async () => {
    const shops = await client().listBarbershops.execute();
    expect(shops.map((shop) => shop.name)).toEqual(['Barbearia Nova Era']);
  });

  it('creates the account with consent through the app and signs in', async () => {
    const user = await client().signUp.execute(newAccount);
    expect(user).toMatchObject({ name: 'Ana Clara', role: 'CLIENT', permissions: [] });
    expect(user.clientId).not.toBeNull();
    await expect(app.useCases.auth.getCurrentUser.execute()).resolves.toEqual(user);

    const profile = await client().getProfile.execute();
    expect(profile).toMatchObject({
      name: 'Ana Clara',
      phone: '(11) 97777-1234',
      email: 'ana@email.demo',
      consent: { termsVersion: '2026.1', channel: 'APP', grantedAt: iso('08:00') },
    });

    // The new client shows up for the staff, and can sign in again later.
    await app.useCases.auth.signOut.execute();
    await app.useCases.auth.signIn.execute({ email: 'ana@email.demo', password: 'segredo1' });
    await as('receptionist');
    const found = await app.useCases.catalog.searchClients.execute({ query: 'ana clara' });
    expect(found.map((row) => row.name)).toEqual(['Ana Clara']);
  });

  it.each([
    ['without consent', { consentGiven: false }, InvalidValueError],
    ['with a short password', { password: 'x'.repeat(MIN_PASSWORD_LENGTH - 1) }, InvalidValueError],
    ['with an invalid phone', { phone: '123' }, InvalidValueError],
    ['with an invalid e-mail', { email: 'ana' }, InvalidValueError],
    ['at an unknown barbershop', { barbershopId: 'nowhere' }, NotFoundError],
    ['with a phone the barbershop already has', { phone: '11 98765-4321' }, AlreadyExistsError],
    ['with an e-mail already in use', { email: 'bruno@novaera.demo' }, AlreadyExistsError],
  ])('refuses to sign up %s', async (_label, changes, error) => {
    await expect(client().signUp.execute({ ...newAccount, ...changes })).rejects.toThrow(error);
    await expect(app.useCases.auth.getCurrentUser.execute()).resolves.toBeNull();
  });

  it('tells which field already exists', async () => {
    await expect(
      client().signUp.execute({ ...newAccount, email: 'ricardo@novaera.demo' }),
    ).rejects.toMatchObject({ code: 'ALREADY_EXISTS', field: 'email' });
  });
});

describe('client bookings', () => {
  it('books only free times and leaves a notice for the staff', async () => {
    const slots = await client().listSlots.execute({
      professionalId: fixture.bruno,
      serviceId: fixture.haircut,
      date: '2026-11-18',
    });
    expect(slots[0]?.start).toBe(iso('09:00'));

    const booked = await bookHaircut('10:00');
    expect(booked).toMatchObject({
      clientId: fixture.joao,
      professionalName: 'Bruno Santos',
      status: 'SCHEDULED',
    });
    const after = await client().listSlots.execute({
      professionalId: fixture.bruno,
      serviceId: fixture.haircut,
      date: '2026-11-18',
    });
    expect(after.map((slot) => slot.start)).not.toContain(iso('10:00'));
    await expect(bookHaircut('10:15')).rejects.toThrow(ScheduleConflictError);

    await as('barber');
    const notices = await app.useCases.notifications.list.execute();
    expect(notices.items[0]).toMatchObject({
      kind: 'APPOINTMENT_BOOKED',
      clientName: 'João Pedro',
      previousStart: iso('10:00'),
      newStart: null,
      read: false,
    });
  });

  it('shows upcoming bookings first and the rest as history', async () => {
    const later = await bookHaircut('15:00');
    const sooner = await bookHaircut('10:00', fixture.ricardo);
    const done = await bookHaircut('11:00');
    await as('barber');
    await app.useCases.agenda.completeAppointment.execute({
      appointmentId: done.id,
      amountPaidCents: 4500,
      paymentMethod: 'PIX',
    });
    await as('client');

    const mine = await client().getMyAppointments.execute();
    expect(mine.upcoming.map((item) => item.id)).toEqual([sooner.id, later.id]);
    expect(mine.past.map((item) => item.id)).toEqual([done.id]);

    // An active booking that is already over goes to the history too.
    app.clock.set(at('16:00'));
    const afterwards = await client().getMyAppointments.execute();
    expect(afterwards.upcoming).toEqual([]);
    expect(afterwards.past.map((item) => item.id)).toEqual([later.id, done.id, sooner.id]);
  });

  it('cancels within the notice period, freeing the time', async () => {
    const booked = await bookHaircut('15:00');
    app.clock.set(at('08:05'));
    const cancelled = await client().cancel.execute({ appointmentId: booked.id });
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancellation: { cancelledBy: 'CLIENT' },
    });
    app.clock.set(at('08:10'));
    await expect(bookHaircut('15:00')).resolves.toMatchObject({ status: 'SCHEDULED' });

    await as('owner');
    const notices = await app.useCases.notifications.list.execute();
    expect(notices.items.map((item) => item.kind)).toEqual([
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_BOOKED',
    ]);
  });

  it('refuses changes after the deadline', async () => {
    const booked = await bookHaircut('09:30');
    await expect(client().cancel.execute({ appointmentId: booked.id })).rejects.toThrow(
      LateChangeNotAllowedError,
    );
    await expect(
      client().reschedule.execute({ appointmentId: booked.id, start: iso('16:00') }),
    ).rejects.toThrow(LateChangeNotAllowedError);
  });

  it('reschedules with the same professional, offering its own time as free', async () => {
    const booked = await bookHaircut('15:00');
    const slots = await client().listSlots.execute({
      professionalId: fixture.bruno,
      serviceId: fixture.haircut,
      date: '2026-11-18',
      ignoreAppointmentId: booked.id,
    });
    expect(slots.map((slot) => slot.start)).toContain(iso('15:00'));

    app.clock.set(at('08:05'));
    const moved = await client().reschedule.execute({
      appointmentId: booked.id,
      start: iso('17:00'),
    });
    expect(moved).toMatchObject({ professionalId: fixture.bruno, start: iso('17:00') });

    await as('barber');
    const [notice] = (await app.useCases.notifications.list.execute()).items;
    expect(notice).toMatchObject({
      kind: 'APPOINTMENT_RESCHEDULED',
      previousStart: iso('15:00'),
      newStart: iso('17:00'),
    });
  });

  it("never touches another client's appointment", async () => {
    await as('receptionist');
    const maria = await app.useCases.agenda.scheduleAppointment.execute({
      professionalId: fixture.bruno,
      clientId: fixture.maria,
      serviceId: fixture.haircut,
      start: iso('15:00'),
    });
    await as('client');

    await expect(client().cancel.execute({ appointmentId: maria.id })).rejects.toThrow(
      NotFoundError,
    );
    await expect(
      client().reschedule.execute({ appointmentId: maria.id, start: iso('17:00') }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      client().listSlots.execute({
        professionalId: fixture.bruno,
        serviceId: fixture.haircut,
        date: '2026-11-18',
        ignoreAppointmentId: maria.id,
      }),
    ).rejects.toThrow(NotFoundError);
    expect((await client().getMyAppointments.execute()).upcoming).toEqual([]);
  });
});

describe('client vs. staff areas', () => {
  it('keeps clients out of the panel', async () => {
    await expect(app.useCases.catalog.searchClients.execute({ query: '' })).rejects.toThrow(
      PermissionDeniedError,
    );
    await expect(
      app.useCases.agenda.scheduleAppointment.execute({
        professionalId: fixture.bruno,
        clientId: fixture.joao,
        serviceId: fixture.haircut,
        start: iso('10:00'),
      }),
    ).rejects.toThrow(PermissionDeniedError);
    const agenda = await app.useCases.agenda.getDailyAgenda.execute({ date: '2026-11-18' });
    expect(agenda.professionals).toEqual([]);
    expect((await app.useCases.notifications.list.execute()).items).toEqual([]);
  });

  it('still lets clients see the barbershop, its services and team (no commission)', async () => {
    const professionals = await app.useCases.catalog.listProfessionals.execute({});
    expect(professionals.every((pro) => pro.commissionPercent === null)).toBe(true);
    expect((await app.useCases.catalog.listServices.execute({})).length).toBeGreaterThan(0);
    await expect(app.useCases.catalog.getBarbershop.execute()).resolves.toMatchObject({
      name: 'Barbearia Nova Era',
    });
  });

  it('keeps staff out of the client area', async () => {
    await as('receptionist');
    await expect(client().getMyAppointments.execute()).rejects.toThrow(PermissionDeniedError);
    await expect(client().getProfile.execute()).rejects.toThrow(PermissionDeniedError);
    await expect(bookHaircut('10:00')).rejects.toThrow(PermissionDeniedError);
  });

  it('refuses to book an anonymized client', async () => {
    await as('owner');
    await app.useCases.catalog.anonymizeClient.execute({ clientId: fixture.joao });
    await as('client');
    await expect(bookHaircut('10:00')).rejects.toMatchObject({ code: 'RESOURCE_INACTIVE' });
  });
});
