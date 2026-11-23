import { NotFoundError } from '@application/errors';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { LateChangeNotAllowedError } from '@domain/errors/appointment-errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { ScheduleConflictError } from '@domain/errors/scheduling-errors';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type Persona, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';

/** Wednesday 2026-11-18, 08:00. Default policy: 2h notice, 15 min no-show tolerance. */
let app: TestApp;
const iso = (time: string) => at(time).toISOString();

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
});

async function as(persona: Persona) {
  await app.useCases.auth.signOut.execute();
  await app.signInAs(persona);
}

function demo() {
  const useCases = app.useCases.demo;
  if (!useCases) throw new Error('demo use cases missing');
  return useCases;
}

function book(start: string, professionalId: string, clientId: string = fixture.joao) {
  return app.useCases.agenda.scheduleAppointment.execute({
    professionalId,
    clientId,
    serviceId: fixture.haircut,
    start: iso(start),
  });
}

describe('settings', () => {
  const settings = () => app.useCases.settings;

  it('lets the owner change the barbershop details', async () => {
    const updated = await settings().updateBarbershop.execute({
      name: '  Nova Era Barbearia ',
      phone: '11 2222-3333',
      address: ' ',
    });
    expect(updated).toMatchObject({
      name: 'Nova Era Barbearia',
      phone: '(11) 2222-3333',
      address: null,
    });
    await expect(app.useCases.catalog.getBarbershop.execute()).resolves.toEqual(updated);

    await expect(
      settings().updateBarbershop.execute({ name: 'X', phone: '123', address: null }),
    ).rejects.toThrow(InvalidValueError);
  });

  it('applies a new cancellation policy to the deadlines shown in the agenda', async () => {
    const updated = await settings().updateCancellationPolicy.execute({
      minNoticeHours: 4,
      noShowToleranceMinutes: 10,
    });
    expect(updated.cancellationPolicy).toEqual({ minNoticeHours: 4, noShowToleranceMinutes: 10 });

    const appointment = await book('14:00', fixture.ricardo);
    expect(appointment.changeDeadline).toBe(iso('10:00'));
    expect(appointment.noShowAllowedFrom).toBe(iso('14:10'));

    await expect(
      settings().updateCancellationPolicy.execute({
        minNoticeHours: 200,
        noShowToleranceMinutes: 10,
      }),
    ).rejects.toThrow(InvalidValueError);
  });

  it.each<Persona>(['receptionist', 'barber'])(
    'is only for the owner (not %s)',
    async (persona) => {
      await as(persona);
      await expect(
        settings().updateBarbershop.execute({ name: 'X', phone: '1134567890', address: null }),
      ).rejects.toThrow(PermissionDeniedError);
      await expect(
        settings().updateCancellationPolicy.execute({
          minNoticeHours: 1,
          noShowToleranceMinutes: 5,
        }),
      ).rejects.toThrow(PermissionDeniedError);
    },
  );
});

describe('client simulator and notifications', () => {
  const notifications = () => app.useCases.notifications;

  it('cancels as the client, frees the time and leaves a notice', async () => {
    const appointment = await book('14:00', fixture.bruno);
    const cancelled = await demo().simulateClientCancel.execute({ appointmentId: appointment.id });

    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      cancellation: { cancelledBy: 'CLIENT', late: false },
    });
    const slots = await app.useCases.agenda.listAvailableSlots.execute({
      professionalId: fixture.bruno,
      serviceId: fixture.haircut,
      date: '2026-11-18',
    });
    expect(slots.map((slot) => slot.start)).toContain(iso('14:00'));

    await expect(notifications().list.execute()).resolves.toEqual({
      unreadCount: 1,
      items: [
        {
          id: expect.any(String) as string,
          kind: 'APPOINTMENT_CANCELLED',
          appointmentId: appointment.id,
          clientName: 'João Pedro',
          professionalName: 'Bruno Santos',
          serviceName: 'Corte',
          previousStart: iso('14:00'),
          newStart: null,
          createdAt: iso('08:00'),
          read: false,
        },
      ],
    });
  });

  it('reschedules as the client, only to a free time with the same professional', async () => {
    const appointment = await book('15:00', fixture.ricardo, fixture.maria);
    await book('16:00', fixture.ricardo);

    await expect(
      demo().simulateClientReschedule.execute({
        appointmentId: appointment.id,
        start: iso('16:00'),
      }),
    ).rejects.toThrow(ScheduleConflictError);

    const moved = await demo().simulateClientReschedule.execute({
      appointmentId: appointment.id,
      start: iso('17:00'),
    });
    expect(moved).toMatchObject({ status: 'SCHEDULED', start: iso('17:00') });

    const { items } = await notifications().list.execute();
    expect(items).toMatchObject([
      {
        kind: 'APPOINTMENT_RESCHEDULED',
        clientName: 'Maria Antônia',
        previousStart: iso('15:00'),
        newStart: iso('17:00'),
      },
    ]);
  });

  it('refuses changes after the notice period, without any notice', async () => {
    const soon = await book('09:30', fixture.ricardo);

    await expect(demo().simulateClientCancel.execute({ appointmentId: soon.id })).rejects.toThrow(
      LateChangeNotAllowedError,
    );
    await expect(
      demo().simulateClientReschedule.execute({ appointmentId: soon.id, start: iso('17:00') }),
    ).rejects.toThrow(LateChangeNotAllowedError);
    await expect(notifications().list.execute()).resolves.toEqual({ unreadCount: 0, items: [] });
  });

  it('shows each person the notices of the agendas they handle, read state per person', async () => {
    const brunos = await book('14:00', fixture.bruno);
    const ricardos = await book('15:00', fixture.ricardo);
    await demo().simulateClientCancel.execute({ appointmentId: brunos.id });
    app.clock.set(at('08:05'));
    await demo().simulateClientCancel.execute({ appointmentId: ricardos.id });

    const owner = await notifications().list.execute();
    expect(owner.items.map((item) => item.professionalName)).toEqual([
      'Ricardo Almeida',
      'Bruno Santos',
    ]);
    const [ricardoNotice, brunoNotice] = owner.items;
    if (!ricardoNotice || !brunoNotice) throw new Error('missing notices');

    await notifications().markRead.execute({ notificationId: brunoNotice.id });
    await expect(notifications().list.execute()).resolves.toMatchObject({ unreadCount: 1 });

    await as('barber');
    const barber = await notifications().list.execute();
    expect(barber).toMatchObject({ unreadCount: 1, items: [{ professionalName: 'Bruno Santos' }] });
    await expect(
      notifications().markRead.execute({ notificationId: ricardoNotice.id }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      demo().simulateClientCancel.execute({ appointmentId: ricardos.id }),
    ).rejects.toThrow(PermissionDeniedError);

    await as('receptionist');
    await expect(notifications().list.execute()).resolves.toMatchObject({ unreadCount: 2 });
    await notifications().markAllRead.execute();
    await expect(notifications().list.execute()).resolves.toMatchObject({ unreadCount: 0 });
    await expect(
      notifications().markRead.execute({ notificationId: 'notif-unknown' }),
    ).rejects.toThrow(NotFoundError);
  });
});
