import { describe, expect, it } from 'vitest';
import { aPolicy, anAppointment, at, ids } from '../testing/builders';
import { toId, type NotificationId, type UserId } from './ids';
import { Notification } from './Notification';

const id = toId<NotificationId>('notif-1');
const bruno = toId<UserId>('user-bruno');
const now = at('08:00');

describe('Notification', () => {
  it('tells that the client cancelled, freeing the previous time', () => {
    const appointment = anAppointment({ start: at('15:00') }).cancel({
      by: 'CLIENT',
      reason: null,
      now,
      policy: aPolicy(),
    });
    const notification = Notification.clientCancelled(appointment, { id, now });

    expect(notification.toProps()).toEqual({
      id,
      barbershopId: ids.shop,
      kind: 'APPOINTMENT_CANCELLED',
      appointmentId: appointment.id,
      professionalId: ids.ricardo,
      clientId: ids.client,
      serviceId: ids.haircut,
      previousStart: at('15:00'),
      newStart: null,
      createdAt: now,
      readBy: [],
    });
  });

  it('tells where the client moved the appointment', () => {
    const before = anAppointment({ start: at('15:00') });
    const after = before.reschedule({
      start: at('17:00'),
      professionalId: ids.bruno,
      by: 'CLIENT',
      now,
      policy: aPolicy(),
    });
    const notification = Notification.clientRescheduled(before, after, { id, now });

    expect(notification).toMatchObject({
      kind: 'APPOINTMENT_RESCHEDULED',
      professionalId: ids.bruno,
      previousStart: at('15:00'),
      newStart: at('17:00'),
    });
  });

  it('is marked as read per person, once', () => {
    const notification = Notification.clientCancelled(anAppointment(), { id, now });
    const read = notification.markReadBy(ids.owner);

    expect(notification.isReadBy(ids.owner)).toBe(false);
    expect(read.isReadBy(ids.owner)).toBe(true);
    expect(read.isReadBy(bruno)).toBe(false);
    expect(read.markReadBy(ids.owner)).toBe(read);
    expect(read.markReadBy(bruno).readBy).toEqual([ids.owner, bruno]);
  });

  it('rejects stored data where the kind and the new start disagree', () => {
    const props = Notification.clientCancelled(anAppointment(), { id, now }).toProps();
    expect(() => Notification.restore({ ...props, newStart: at('17:00') })).toThrow(
      /only a reschedule/,
    );
    expect(() => Notification.restore({ ...props, kind: 'APPOINTMENT_RESCHEDULED' })).toThrow(
      /only a reschedule/,
    );
    expect(Notification.restore({ ...props, readBy: [bruno, bruno] }).readBy).toEqual([bruno]);
  });
});
