import { NotAuthenticatedError, NotFoundError } from '@application/errors';
import type { PaymentMethod } from '@domain/entities/Appointment';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type Persona, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Fixture: Ricardo (owner, 100% commission) and Bruno (40%) work Mon–Fri 09–19, lunch 12–13
 * (540 min a day). Story: João came on Wed 11/11; on Wed 18/11 the shop had a busy morning.
 */
const LAST_WEEK = '2026-11-11';
const DAY = '2026-11-18';

let app: TestApp;
const iso = (time: string, date = DAY) => at(time, date).toISOString();

async function signInAt(persona: Persona, instant: Date) {
  app.clock.set(instant);
  await app.signInAs(persona);
}

function book(
  start: string,
  overrides: Partial<{ professionalId: string; serviceId: string; clientId: string }> = {},
) {
  return app.useCases.agenda.scheduleAppointment.execute({
    professionalId: fixture.ricardo,
    clientId: fixture.joao,
    serviceId: fixture.haircut,
    start,
    ...overrides,
  });
}

const complete = (appointmentId: string, cents: number, method: PaymentMethod = 'PIX') =>
  app.useCases.agenda.completeAppointment.execute({
    appointmentId,
    amountPaidCents: cents,
    paymentMethod: method,
  });

const report = (input: { from?: string; to?: string; professionalId?: string } = {}) =>
  app.useCases.reports.getReport.execute({ from: DAY, to: DAY, ...input });

beforeEach(async () => {
  app = createTestApp({ now: at('08:00', LAST_WEEK) });
  await app.signInAs('owner');
  const lastWeek = await book(iso('10:00', LAST_WEEK));

  await signInAt('owner', at('08:00'));
  const haircut = await book(iso('09:00'));
  const combo = await book(iso('10:00'), {
    professionalId: fixture.bruno,
    clientId: fixture.maria,
    serviceId: fixture.combo,
  });
  const missed = await book(iso('14:00'), { professionalId: fixture.bruno });
  const cancelled = await book(iso('15:00'), { clientId: fixture.maria });
  await app.useCases.agenda.cancelAppointment.execute({
    appointmentId: cancelled.id,
    reason: null,
  });
  await app.useCases.agenda.blockTime.execute({
    professionalId: fixture.bruno,
    start: iso('16:00'),
    end: iso('18:00'),
    reason: 'Médico',
  });

  await signInAt('owner', at('19:00'));
  await complete(lastWeek.id, 4500);
  await complete(haircut.id, 4500);
  await complete(combo.id, 7000, 'CASH');
  await app.useCases.agenda.markNoShow.execute({ appointmentId: missed.id });
});

describe('GetReport', () => {
  it("gives the owner the whole barbershop's numbers", async () => {
    const result = await report();

    expect(result).toMatchObject({
      from: DAY,
      to: DAY,
      scope: 'BARBERSHOP',
      totals: {
        appointments: 4,
        completed: 2,
        noShows: 1,
        cancellations: 1,
        revenueCents: 11500,
        // Ricardo keeps 100% of 45,00; Bruno 40% of 70,00
        commissionCents: 4500 + 2800,
        averageTicketCents: 5750,
        noShowPercent: 33,
        // (30 + 90 booked) ÷ (540 + 540 − 120 blocked) = 12.5%
        occupancyPercent: 13,
      },
      services: [
        { id: fixture.haircut, name: 'Corte', count: 2, revenueCents: 4500 },
        { id: fixture.combo, name: 'Corte + Barba', count: 1, revenueCents: 7000 },
      ],
      payments: [
        { method: 'CASH', count: 1, amountCents: 7000 },
        { method: 'PIX', count: 1, amountCents: 4500 },
      ],
      // João had come last week (7 days before); Maria is new.
      clients: { served: 2, returning: 1, returningPercent: 50, averageDaysBetweenVisits: 7 },
    });

    // Highest revenue first.
    expect(result.professionals).toEqual([
      {
        id: fixture.bruno,
        name: 'Bruno Santos',
        photoUrl: null,
        revenueCents: 7000,
        commissionPercent: 40,
        commissionCents: 2800,
        completed: 1,
        noShows: 1,
        cancellations: 0,
        noShowPercent: 50,
        occupancyPercent: 21,
        bookedMinutes: 90,
        availableMinutes: 420,
      },
      expect.objectContaining({
        id: fixture.ricardo,
        revenueCents: 4500,
        commissionCents: 4500,
        cancellations: 1,
        occupancyPercent: 6,
      }),
    ]);
  });

  it('covers several days and leaves out inactive professionals without appointments', async () => {
    await app.useCases.catalog.setProfessionalActive.execute({ id: fixture.bruno, active: false });

    const week = await report({ from: '2026-11-16', to: '2026-11-22' });
    expect(week.totals).toMatchObject({ appointments: 4, revenueCents: 11500 });
    expect(week.professionals.map((entry) => entry.name)).toEqual([
      'Bruno Santos',
      'Ricardo Almeida',
    ]);

    const nextWeek = await report({ from: '2026-11-23', to: '2026-11-29' });
    expect(nextWeek.professionals.map((entry) => entry.name)).toEqual(['Ricardo Almeida']);
    expect(nextWeek.totals).toMatchObject({
      appointments: 0,
      revenueCents: 0,
      averageTicketCents: null,
      noShowPercent: null,
      occupancyPercent: 0,
    });
  });

  it('lets the owner look at a single professional', async () => {
    const result = await report({ professionalId: fixture.bruno });
    expect(result.scope).toBe('PROFESSIONAL');
    expect(result.professionals.map((entry) => entry.id)).toEqual([fixture.bruno]);
    expect(result.totals).toMatchObject({ appointments: 2, revenueCents: 7000 });
    expect(result.clients).toMatchObject({ served: 1, returning: 0 });

    await expect(report({ professionalId: 'pro-unknown' })).rejects.toThrow(NotFoundError);
  });

  it('gives a professional only their own numbers ("Meus números")', async () => {
    await signInAt('barber', at('19:00'));

    for (const result of [await report(), await report({ professionalId: fixture.ricardo })]) {
      expect(result.scope).toBe('PROFESSIONAL');
      expect(result.professionals.map((entry) => entry.id)).toEqual([fixture.bruno]);
      expect(result.totals).toMatchObject({ revenueCents: 7000, commissionCents: 2800 });
    }
  });

  it('is not available to the reception nor without a session', async () => {
    await signInAt('receptionist', at('19:00'));
    await expect(report()).rejects.toThrow(PermissionDeniedError);

    await app.useCases.auth.signOut.execute();
    await expect(report()).rejects.toThrow(NotAuthenticatedError);
  });

  it('rejects malformed or reversed periods', async () => {
    await expect(report({ from: '18/11/2026' })).rejects.toThrow(InvalidValueError);
    await expect(report({ from: '2026-11-19', to: DAY })).rejects.toThrow(InvalidValueError);
    await expect(report({ from: '2025-01-01', to: DAY })).rejects.toThrow(InvalidValueError);
  });
});
