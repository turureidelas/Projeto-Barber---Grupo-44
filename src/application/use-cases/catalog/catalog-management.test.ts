import { AlreadyExistsError, NotFoundError } from '@application/errors';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { at, ids } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';

let app: TestApp;
const catalog = () => app.useCases.catalog;

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
});

describe('services and combos', () => {
  it('creates a service and a combo with its own duration and price', async () => {
    const eyebrows = await catalog().createService.execute({
      name: 'Sobrancelha',
      durationMinutes: 15,
      priceCents: 1500,
      includedServiceIds: [],
    });
    expect(eyebrows).toMatchObject({ kind: 'SINGLE', durationMinutes: 15, active: true });

    const combo = await catalog().createService.execute({
      name: 'Completo',
      durationMinutes: 70,
      priceCents: 9000,
      includedServiceIds: [fixture.haircut, ids.beard, eyebrows.id],
    });
    expect(combo).toMatchObject({ kind: 'COMBO', durationMinutes: 70, priceCents: 9000 });
    expect(combo.includedServiceIds).toHaveLength(3);
  });

  it('refuses combos of one service or with unknown services', async () => {
    const combo = (includedServiceIds: string[]) =>
      catalog().createService.execute({
        name: 'X',
        durationMinutes: 30,
        priceCents: 100,
        includedServiceIds,
      });
    await expect(combo([fixture.haircut])).rejects.toThrow(InvalidValueError);
    await expect(combo([fixture.haircut, 'svc-unknown'])).rejects.toThrow(NotFoundError);
  });

  it('edits services (and combo items) and toggles them', async () => {
    const haircut = await catalog().updateService.execute({
      serviceId: fixture.haircut,
      name: 'Corte social',
      durationMinutes: 40,
      priceCents: 5000,
      includedServiceIds: [],
    });
    expect(haircut).toMatchObject({ name: 'Corte social', durationMinutes: 40, priceCents: 5000 });

    const eyebrows = await catalog().createService.execute({
      name: 'Sobrancelha',
      durationMinutes: 15,
      priceCents: 1500,
      includedServiceIds: [],
    });
    const combo = await catalog().updateService.execute({
      serviceId: fixture.combo,
      name: 'Corte + Sobrancelha',
      durationMinutes: 50,
      priceCents: 5500,
      includedServiceIds: [fixture.haircut, eyebrows.id],
    });
    expect(combo.includedServiceIds).toEqual([fixture.haircut, eyebrows.id]);

    const inactive = await catalog().setServiceActive.execute({
      id: fixture.haircut,
      active: false,
    });
    expect(inactive.active).toBe(false);
    const listed = await catalog().listServices.execute({});
    expect(listed.map((service) => service.id)).not.toContain(fixture.haircut);
  });

  it('is reserved to the owner', async () => {
    await app.signInAs('receptionist');
    await expect(
      catalog().setServiceActive.execute({ id: fixture.haircut, active: false }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

describe('team and working hours', () => {
  it('creates a professional without hours, then sets the weekly schedule', async () => {
    const diego = await catalog().createProfessional.execute({
      name: 'Diego Lima',
      specialty: 'Barba',
      photoUrl: null,
      commissionPercent: 60,
    });
    expect(diego).toMatchObject({ name: 'Diego Lima', commissionPercent: 60, schedule: [] });

    const scheduled = await catalog().updateWorkSchedule.execute({
      professionalId: diego.id,
      schedule: [
        { weekday: 3, start: '09:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
        { weekday: 6, start: '08:00', end: '14:00', breaks: [] },
      ],
    });
    expect(scheduled.schedule.map((day) => day.weekday)).toEqual([3, 6]);

    const slots = await app.useCases.agenda.listAvailableSlots.execute({
      professionalId: diego.id,
      serviceId: fixture.haircut,
      date: '2026-11-18',
    });
    expect(slots[0]?.start).toBe(at('09:00').toISOString());
  });

  it('rejects invalid schedules', async () => {
    const update = (
      schedule: Parameters<
        ReturnType<typeof catalog>['updateWorkSchedule']['execute']
      >[0]['schedule'],
    ) => catalog().updateWorkSchedule.execute({ professionalId: fixture.bruno, schedule });
    await expect(
      update([{ weekday: 9, start: '09:00', end: '18:00', breaks: [] }]),
    ).rejects.toThrow(InvalidValueError);
    await expect(
      update([
        { weekday: 1, start: '09:00', end: '18:00', breaks: [] },
        { weekday: 1, start: '10:00', end: '12:00', breaks: [] },
      ]),
    ).rejects.toThrow(InvalidValueError);
    await expect(
      update([
        { weekday: 1, start: '09:00', end: '18:00', breaks: [{ start: '17:00', end: '19:00' }] },
      ]),
    ).rejects.toThrow(InvalidValueError);
  });

  it('edits and deactivates professionals', async () => {
    const bruno = await catalog().updateProfessional.execute({
      professionalId: fixture.bruno,
      name: 'Bruno S.',
      specialty: 'Degradê',
      photoUrl: null,
      commissionPercent: 45,
    });
    expect(bruno).toMatchObject({ name: 'Bruno S.', commissionPercent: 45 });
    expect(
      (await catalog().getProfessional.execute({ professionalId: fixture.bruno })).schedule,
    ).toHaveLength(6);

    await catalog().setProfessionalActive.execute({ id: fixture.bruno, active: false });
    const active = await catalog().listProfessionals.execute({});
    expect(active.map((p) => p.id)).toEqual([fixture.ricardo]);
  });

  it('does not let a barber edit anyone’s schedule, not even their own', async () => {
    await app.signInAs('barber');
    await expect(
      catalog().updateWorkSchedule.execute({ professionalId: fixture.bruno, schedule: [] }),
    ).rejects.toThrow(PermissionDeniedError);
  });
});

describe('clients', () => {
  const create = (phone: string, consentGiven = true) =>
    catalog().createClient.execute({
      name: 'Pedro Alves',
      phone,
      email: ' pedro@email.demo ',
      consentGiven,
    });

  it('registers a client with LGPD consent and returns masked contacts', async () => {
    const pedro = await create('(11) 97777-1234');
    expect(pedro).toMatchObject({
      name: 'Pedro Alves',
      phoneMasked: '(11) *****-1234',
      emailMasked: 'p***@email.demo',
    });
    const details = await catalog().getClientDetails.execute({ clientId: pedro.id });
    expect(details).toMatchObject({
      phone: '(11) 97777-1234',
      email: 'pedro@email.demo',
      consent: { termsVersion: '2026.1', channel: 'PANEL', grantedAt: at('08:00').toISOString() },
    });
  });

  it('requires consent and a unique phone', async () => {
    await expect(create('11977771234', false)).rejects.toThrow(InvalidValueError);
    await expect(create('(11) 98765-4321')).rejects.toThrow(AlreadyExistsError);
  });

  it('updates contact data, keeping phones unique', async () => {
    const updated = await catalog().updateClient.execute({
      clientId: fixture.joao,
      name: 'João Pedro Souza',
      phone: '(11) 98765-4321',
      email: null,
    });
    expect(updated).toMatchObject({ name: 'João Pedro Souza', emailMasked: null });
    await expect(
      catalog().updateClient.execute({
        clientId: fixture.joao,
        name: 'João',
        phone: '(11) 91234-5678',
        email: null,
      }),
    ).rejects.toThrow(AlreadyExistsError);
  });

  it('shows history, no-shows and return frequency', async () => {
    const agenda = app.useCases.agenda;
    const book = (date: string) =>
      agenda.scheduleAppointment.execute({
        professionalId: fixture.ricardo,
        clientId: fixture.joao,
        serviceId: fixture.haircut,
        start: at('10:00', date).toISOString(),
      });
    const first = await book('2026-11-18');
    const second = await book('2026-11-25');
    const third = await book('2026-12-02');

    // Sessions last 12h: sign in again after each jump in time.
    const travel = async (date: string) => {
      app.clock.set(at('10:40', date));
      await app.signInAs('owner');
    };
    await travel('2026-11-18');
    await agenda.completeAppointment.execute({
      appointmentId: first.id,
      amountPaidCents: 4500,
      paymentMethod: 'PIX',
    });
    await travel('2026-11-25');
    await agenda.completeAppointment.execute({
      appointmentId: second.id,
      amountPaidCents: 5000,
      paymentMethod: 'CASH',
    });
    await travel('2026-12-02');
    await agenda.markNoShow.execute({ appointmentId: third.id });

    const details = await catalog().getClientDetails.execute({ clientId: fixture.joao });
    expect(details.stats).toEqual({
      visits: 2,
      noShows: 1,
      cancellations: 0,
      lastVisit: at('10:00', '2026-11-25').toISOString(),
      averageDaysBetweenVisits: 7,
      totalSpentCents: 9500,
    });
    expect(details.history.map((a) => a.status)).toEqual(['NO_SHOW', 'COMPLETED', 'COMPLETED']);
  });

  it('keeps client records away from barbers', async () => {
    await app.signInAs('barber');
    await expect(catalog().getClientDetails.execute({ clientId: fixture.joao })).rejects.toThrow(
      PermissionDeniedError,
    );
    await expect(create('11977771234')).rejects.toThrow(PermissionDeniedError);
  });
});
