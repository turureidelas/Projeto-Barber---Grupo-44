import { NotAuthenticatedError, NotFoundError, ResourceInactiveError } from '@application/errors';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import {
  CancellationReasonRequiredError,
  NoShowTooEarlyError,
} from '@domain/errors/appointment-errors';
import {
  OutsideWorkingHoursError,
  ScheduleConflictError,
  SlotInPastError,
  TimeBlockedError,
} from '@domain/errors/scheduling-errors';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';

/** Wednesday 2026-11-18, 08:00. Ricardo & Bruno work 09:00–19:00 (lunch 12:00–13:00). */
let app: TestApp;
const iso = (time: string, date?: string) => at(time, date).toISOString();

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
});

function book(
  start: string,
  overrides: Partial<{ professionalId: string; serviceId: string; clientId: string }> = {},
) {
  return app.useCases.agenda.scheduleAppointment.execute({
    professionalId: fixture.ricardo,
    clientId: fixture.joao,
    serviceId: fixture.haircut,
    start: iso(start),
    ...overrides,
  });
}

describe('ScheduleAppointment', () => {
  it('books a client and returns a ready-to-show DTO', async () => {
    const appointment = await book('10:00');
    expect(appointment).toMatchObject({
      professionalName: 'Ricardo Almeida',
      clientName: 'João Pedro',
      clientPhoneMasked: '(11) *****-4321',
      serviceName: 'Corte',
      status: 'SCHEDULED',
      start: iso('10:00'),
      end: iso('10:30'),
      durationMinutes: 30,
      priceCents: 4500,
      noShowAllowedFrom: iso('10:15'),
      changeDeadline: iso('08:00'),
      payment: null,
      cancellation: null,
    });
  });

  it('never double-books the same professional', async () => {
    await book('10:00');
    await expect(book('10:15', { clientId: fixture.maria })).rejects.toThrow(ScheduleConflictError);
  });

  it('allows the same time with another professional', async () => {
    await book('10:00');
    await expect(book('10:00', { professionalId: fixture.bruno })).resolves.toMatchObject({
      professionalName: 'Bruno Santos',
    });
  });

  it('uses the combo duration', async () => {
    const combo = await book('11:00', { serviceId: fixture.combo });
    expect(combo.end).toBe(iso('12:00'));
    await expect(
      book('11:15', { serviceId: fixture.combo, professionalId: fixture.bruno }),
    ).rejects.toThrow(OutsideWorkingHoursError);
  });

  it('rejects times in the past or outside working hours', async () => {
    app.clock.set(at('10:00'));
    await expect(book('09:30')).rejects.toThrow(SlotInPastError);
    await expect(book('19:00')).rejects.toThrow(OutsideWorkingHoursError);
  });

  it('rejects inactive services and unknown clients', async () => {
    await expect(book('10:00', { serviceId: fixture.inactiveService })).rejects.toThrow(
      ResourceInactiveError,
    );
    await expect(book('10:00', { clientId: 'client-unknown' })).rejects.toThrow(NotFoundError);
  });

  it('lets barbers book only in their own agenda', async () => {
    await app.signInAs('barber');
    await expect(book('10:00', { professionalId: fixture.bruno })).resolves.toBeDefined();
    await expect(book('10:00')).rejects.toThrow(PermissionDeniedError);
  });

  it('lets the receptionist book for anyone', async () => {
    await app.signInAs('receptionist');
    await expect(book('10:00')).resolves.toBeDefined();
    await expect(book('10:00', { professionalId: fixture.bruno })).resolves.toBeDefined();
  });

  it('requires a session', async () => {
    await app.useCases.auth.signOut.execute();
    await expect(book('10:00')).rejects.toThrow(NotAuthenticatedError);
  });
});

describe('appointment status commands', () => {
  const agenda = () => app.useCases.agenda;

  it('confirms, marks arrival and completes with payment', async () => {
    const { id } = await book('10:00');
    expect((await agenda().confirmAppointment.execute({ appointmentId: id })).status).toBe(
      'CONFIRMED',
    );
    expect((await agenda().markArrived.execute({ appointmentId: id })).status).toBe('IN_SERVICE');

    const done = await agenda().completeAppointment.execute({
      appointmentId: id,
      amountPaidCents: 5000,
      paymentMethod: 'PIX',
    });
    expect(done.status).toBe('COMPLETED');
    expect(done.payment).toEqual({
      amountPaidCents: 5000,
      method: 'PIX',
      completedAt: iso('08:00'),
    });
  });

  it('only records "cliente faltou" after the tolerance', async () => {
    const { id } = await book('10:00');
    app.clock.set(at('10:10'));
    await expect(agenda().markNoShow.execute({ appointmentId: id })).rejects.toThrow(
      NoShowTooEarlyError,
    );
    app.clock.set(at('10:15'));
    expect((await agenda().markNoShow.execute({ appointmentId: id })).status).toBe('NO_SHOW');
  });

  it('requires a reason to cancel late and frees the slot immediately', async () => {
    const { id } = await book('10:00');
    app.clock.set(at('09:00'));
    await expect(
      agenda().cancelAppointment.execute({ appointmentId: id, reason: null }),
    ).rejects.toThrow(CancellationReasonRequiredError);

    const cancelled = await agenda().cancelAppointment.execute({
      appointmentId: id,
      reason: 'Barbeiro passou mal',
    });
    expect(cancelled.cancellation).toMatchObject({ cancelledBy: 'STAFF', late: true });
    await expect(book('10:00', { clientId: fixture.maria })).resolves.toMatchObject({
      status: 'SCHEDULED',
    });
  });

  it('does not let a barber act on another barber’s appointment', async () => {
    const { id } = await book('10:00');
    await app.signInAs('barber');
    await expect(agenda().confirmAppointment.execute({ appointmentId: id })).rejects.toThrow(
      PermissionDeniedError,
    );
  });

  it('reports unknown appointments as not found', async () => {
    await expect(agenda().confirmAppointment.execute({ appointmentId: 'nope' })).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('RescheduleAppointment', () => {
  const reschedule = (appointmentId: string, start: string, professionalId?: string) =>
    app.useCases.agenda.rescheduleAppointment.execute({
      appointmentId,
      start: iso(start),
      ...(professionalId && { professionalId }),
    });

  it('moves the appointment and frees the previous time', async () => {
    const { id } = await book('10:00');
    const moved = await reschedule(id, '15:00');
    expect(moved).toMatchObject({
      id,
      start: iso('15:00'),
      end: iso('15:30'),
      status: 'SCHEDULED',
    });
    await expect(book('10:00', { clientId: fixture.maria })).resolves.toBeDefined();
  });

  it('may overlap its own previous time', async () => {
    const { id } = await book('10:00');
    await expect(reschedule(id, '10:15')).resolves.toMatchObject({ start: iso('10:15') });
  });

  it('refuses a time taken by someone else', async () => {
    const { id } = await book('10:00');
    await book('15:00', { clientId: fixture.maria });
    await expect(reschedule(id, '15:15')).rejects.toThrow(ScheduleConflictError);
  });

  it('can move to another professional', async () => {
    const { id } = await book('10:00');
    await expect(reschedule(id, '10:00', fixture.bruno)).resolves.toMatchObject({
      professionalName: 'Bruno Santos',
    });
  });
});

describe('ListAvailableSlots', () => {
  const slots = (overrides: Partial<{ serviceId: string; ignoreAppointmentId: string }> = {}) =>
    app.useCases.agenda.listAvailableSlots.execute({
      professionalId: fixture.ricardo,
      serviceId: fixture.haircut,
      date: '2026-11-18',
      ...overrides,
    });

  it('lists only free starts, as ISO instants', async () => {
    const before = await slots();
    expect(before).toHaveLength(34);
    expect(before[0]).toEqual({ start: iso('09:00'), end: iso('09:30') });

    const { id } = await book('10:00');
    const starts = (await slots()).map((slot) => slot.start);
    expect(starts).not.toContain(iso('10:00'));
    expect(starts).toContain(iso('10:30'));

    const whenMoving = (await slots({ ignoreAppointmentId: id })).map((slot) => slot.start);
    expect(whenMoving).toContain(iso('10:00'));
  });

  it('returns nothing for inactive services', async () => {
    await expect(slots({ serviceId: fixture.inactiveService })).resolves.toEqual([]);
  });
});

describe('BlockTime / UnblockTime', () => {
  const block = (start: string, end: string, professionalId: string = fixture.ricardo) =>
    app.useCases.agenda.blockTime.execute({
      professionalId,
      start: iso(start),
      end: iso(end),
      reason: 'Médico',
    });

  it('blocks free time so it cannot be booked, and unblocking frees it', async () => {
    const created = await block('15:00', '16:00');
    expect(created).toMatchObject({ start: iso('15:00'), end: iso('16:00'), reason: 'Médico' });
    await expect(book('15:30')).rejects.toThrow(TimeBlockedError);

    await app.useCases.agenda.unblockTime.execute({ timeBlockId: created.id });
    await expect(book('15:30')).resolves.toBeDefined();
  });

  it('refuses to block over a booked client', async () => {
    await book('10:00');
    await expect(block('09:00', '12:00')).rejects.toThrow(ScheduleConflictError);
  });

  it('lets barbers block only their own time and receptionists not at all', async () => {
    await app.signInAs('barber');
    await expect(block('15:00', '16:00', fixture.bruno)).resolves.toBeDefined();
    await expect(block('15:00', '16:00')).rejects.toThrow(PermissionDeniedError);

    await app.signInAs('receptionist');
    await expect(block('17:00', '18:00', fixture.bruno)).rejects.toThrow(PermissionDeniedError);
  });
});

describe('GetDailyAgenda', () => {
  const daily = (professionalId?: string) =>
    app.useCases.agenda.getDailyAgenda.execute({
      date: '2026-11-18',
      ...(professionalId && { professionalId }),
    });

  it('shows everyone to the owner, sorted, with the next client', async () => {
    await book('11:00');
    await book('09:00', { professionalId: fixture.bruno });
    await app.useCases.agenda.blockTime.execute({
      professionalId: fixture.bruno,
      start: iso('16:00'),
      end: iso('17:00'),
      reason: null,
    });

    const agenda = await daily();
    expect(agenda.date).toBe('2026-11-18');
    expect(agenda.professionals.map((p) => p.name)).toEqual(['Bruno Santos', 'Ricardo Almeida']);
    expect(agenda.appointments.map((a) => a.start)).toEqual([iso('09:00'), iso('11:00')]);
    expect(agenda.timeBlocks).toHaveLength(1);
    expect(agenda.next?.start).toBe(iso('09:00'));
    expect(agenda.inService).toEqual([]);
  });

  it('can be filtered by professional', async () => {
    await book('11:00');
    await book('09:00', { professionalId: fixture.bruno });
    const agenda = await daily(fixture.ricardo);
    expect(agenda.professionals.map((p) => p.id)).toEqual([fixture.ricardo]);
    expect(agenda.appointments).toHaveLength(1);
  });

  it('shows only their own agenda to a barber', async () => {
    await book('11:00');
    await book('09:00', { professionalId: fixture.bruno });
    await app.signInAs('barber');
    const agenda = await daily(fixture.ricardo);
    expect(agenda.professionals).toEqual([]);

    const own = await daily();
    expect(own.appointments.map((a) => a.professionalName)).toEqual(['Bruno Santos']);
  });

  it('tracks who is next, who is in service and the day summary', async () => {
    const first = await book('09:00');
    const second = await book('10:00');
    const third = await book('11:00');
    await book('14:00');
    const agenda = app.useCases.agenda;

    app.clock.set(at('10:20'));
    await agenda.completeAppointment.execute({
      appointmentId: first.id,
      amountPaidCents: 4500,
      paymentMethod: 'CASH',
    });
    await agenda.markNoShow.execute({ appointmentId: second.id });
    await agenda.markArrived.execute({ appointmentId: third.id });

    const result = await daily();
    expect(result.inService.map((a) => a.id)).toEqual([third.id]);
    expect(result.next?.start).toBe(iso('14:00'));
    expect(result.summary).toEqual({
      totalAppointments: 4,
      completed: 1,
      noShows: 1,
      cancelled: 0,
      remaining: 2,
      revenueCents: 4500,
    });
  });

  it('hides revenue from the receptionist', async () => {
    await app.signInAs('receptionist');
    expect((await daily()).summary.revenueCents).toBeNull();
  });
});

describe('GetWeeklyAgenda', () => {
  const weekly = (professionalId: string = fixture.ricardo) =>
    app.useCases.agenda.getWeeklyAgenda.execute({ startDate: '2026-11-16', professionalId });

  it('returns seven days with working hours, appointments and blocks', async () => {
    await book('10:00');
    await app.useCases.agenda.blockTime.execute({
      professionalId: fixture.ricardo,
      start: iso('15:00'),
      end: iso('16:00'),
      reason: null,
    });
    await book('10:00', { professionalId: fixture.bruno });

    const week = await weekly();
    expect(week.professional.name).toBe('Ricardo Almeida');
    expect(week.days.map((day) => day.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    const wednesday = week.days[2];
    expect(wednesday?.workingHours).toEqual([
      { start: '09:00', end: '12:00' },
      { start: '13:00', end: '19:00' },
    ]);
    expect(wednesday?.appointments.map((a) => a.professionalName)).toEqual(['Ricardo Almeida']);
    expect(wednesday?.timeBlocks).toHaveLength(1);
    expect(week.days[6]?.workingHours).toEqual([]);
    expect(week.days[0]?.appointments).toEqual([]);
  });

  it('only shows a barber their own week', async () => {
    await app.signInAs('barber');
    await expect(weekly(fixture.bruno)).resolves.toBeDefined();
    await expect(weekly()).rejects.toThrow(PermissionDeniedError);
  });
});
