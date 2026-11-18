import { describe, expect, it } from 'vitest';
import {
  CancellationReasonRequiredError,
  InvalidStatusTransitionError,
  LateChangeNotAllowedError,
  NoShowTooEarlyError,
} from '../errors/appointment-errors';
import { InvalidValueError } from '../errors/DomainError';
import { aPolicy, anAppointment, at, ids, minutes, reais } from '../testing/builders';
import { Appointment } from './Appointment';
import type { AppointmentStatus } from './AppointmentStatus';

/** Appointment at 10:00–10:30 on the reference day; policy: 2h notice, 15 min tolerance. */
const policy = aPolicy(2, 15);

function inStatus(status: AppointmentStatus): Appointment {
  const scheduled = anAppointment();
  switch (status) {
    case 'SCHEDULED':
      return scheduled;
    case 'CONFIRMED':
      return scheduled.confirm();
    case 'IN_SERVICE':
      return scheduled.markArrived();
    case 'NO_SHOW':
      return scheduled.markNoShow(at('10:30'), policy);
    case 'COMPLETED':
      return scheduled.complete({ amountPaid: reais(45), paymentMethod: 'PIX', now: at('10:30') });
    case 'CANCELLED':
      return scheduled.cancel({ by: 'STAFF', reason: null, now: at('07:00'), policy });
  }
}

describe('Appointment', () => {
  describe('schedule', () => {
    it('starts as SCHEDULED, occupying [start, start + duration)', () => {
      const appointment = anAppointment({ start: at('10:00'), duration: minutes(45) });
      expect(appointment.status).toBe('SCHEDULED');
      expect(appointment.start).toEqual(at('10:00'));
      expect(appointment.end).toEqual(at('10:45'));
      expect(appointment.isActive).toBe(true);
      expect(appointment.cancellation).toBeNull();
      expect(appointment.serviceRecord).toBeNull();
    });
  });

  describe('status transitions', () => {
    it('confirms a scheduled appointment without mutating the original', () => {
      const scheduled = anAppointment();
      const confirmed = scheduled.confirm();
      expect(confirmed.status).toBe('CONFIRMED');
      expect(scheduled.status).toBe('SCHEDULED');
    });

    it.each<AppointmentStatus>(['SCHEDULED', 'CONFIRMED', 'NO_SHOW'])(
      'marks arrival from %s',
      (status) => {
        expect(inStatus(status).markArrived().status).toBe('IN_SERVICE');
      },
    );

    it.each<AppointmentStatus>(['SCHEDULED', 'CONFIRMED', 'IN_SERVICE'])(
      'completes from %s, recording payment',
      (status) => {
        const completed = inStatus(status).complete({
          amountPaid: reais(50),
          paymentMethod: 'CASH',
          now: at('10:35'),
        });
        expect(completed.status).toBe('COMPLETED');
        expect(completed.isActive).toBe(false);
        expect(completed.serviceRecord?.amountPaid.cents).toBe(5000);
        expect(completed.serviceRecord?.paymentMethod).toBe('CASH');
        expect(completed.serviceRecord?.completedAt).toEqual(at('10:35'));
        expect(completed.price.cents).toBe(4500); // booked price is kept
      },
    );

    const invalid: [AppointmentStatus, (a: Appointment) => Appointment][] = [
      ['CONFIRMED', (a) => a.confirm()],
      ['COMPLETED', (a) => a.markArrived()],
      ['CANCELLED', (a) => a.markArrived()],
      ['IN_SERVICE', (a) => a.markNoShow(at('11:00'), policy)],
      [
        'NO_SHOW',
        (a) => a.complete({ amountPaid: reais(1), paymentMethod: 'PIX', now: at('11:00') }),
      ],
      [
        'CANCELLED',
        (a) => a.complete({ amountPaid: reais(1), paymentMethod: 'PIX', now: at('11:00') }),
      ],
      ['COMPLETED', (a) => a.cancel({ by: 'STAFF', reason: 'x', now: at('11:00'), policy })],
      ['IN_SERVICE', (a) => a.cancel({ by: 'STAFF', reason: 'x', now: at('11:00'), policy })],
      [
        'CANCELLED',
        (a) => a.reschedule({ start: at('15:00'), by: 'STAFF', now: at('07:00'), policy }),
      ],
      [
        'NO_SHOW',
        (a) => a.reschedule({ start: at('15:00'), by: 'STAFF', now: at('11:00'), policy }),
      ],
    ];

    it.each(invalid)('rejects an invalid action from %s', (status, action) => {
      const appointment = inStatus(status);
      expect(() => action(appointment)).toThrow(InvalidStatusTransitionError);
    });

    it('reports the current status and the attempted action', () => {
      const error = captureError(() => inStatus('CONFIRMED').confirm());
      expect(error).toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
        from: 'CONFIRMED',
        action: 'confirm',
      });
    });
  });

  describe('markNoShow ("cliente faltou")', () => {
    it('is not allowed before the tolerance has passed', () => {
      const error = captureError(() => anAppointment().markNoShow(at('10:14'), policy));
      expect(error).toBeInstanceOf(NoShowTooEarlyError);
      expect((error as NoShowTooEarlyError).allowedFrom).toEqual(at('10:15'));
    });

    it('is allowed once the tolerance has passed and frees the slot', () => {
      const noShow = anAppointment().confirm().markNoShow(at('10:15'), policy);
      expect(noShow.status).toBe('NO_SHOW');
      expect(noShow.isActive).toBe(false);
    });
  });

  describe('cancel', () => {
    it('lets the client cancel up to the deadline', () => {
      const cancelled = anAppointment().cancel({
        by: 'CLIENT',
        reason: null,
        now: at('08:00'),
        policy,
      });
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.isActive).toBe(false);
      expect(cancelled.cancellation).toEqual({
        cancelledAt: at('08:00'),
        cancelledBy: 'CLIENT',
        reason: null,
        late: false,
      });
    });

    it('blocks the client after the deadline', () => {
      const error = captureError(() =>
        anAppointment().cancel({ by: 'CLIENT', reason: 'Imprevisto', now: at('08:01'), policy }),
      );
      expect(error).toBeInstanceOf(LateChangeNotAllowedError);
      expect(error).toMatchObject({ action: 'cancel', minNoticeHours: 2 });
    });

    it('requires a reason when staff cancels late', () => {
      expect(() =>
        anAppointment().cancel({ by: 'STAFF', reason: '   ', now: at('09:00'), policy }),
      ).toThrow(CancellationReasonRequiredError);
    });

    it('lets staff cancel late with a reason, flagging it as late', () => {
      const cancelled = anAppointment().cancel({
        by: 'STAFF',
        reason: '  Barbeiro passou mal ',
        now: at('09:00'),
        policy,
      });
      expect(cancelled.cancellation).toMatchObject({ reason: 'Barbeiro passou mal', late: true });
    });

    it('lets staff cancel on time without a reason', () => {
      const cancelled = anAppointment().cancel({
        by: 'STAFF',
        reason: null,
        now: at('07:00'),
        policy,
      });
      expect(cancelled.cancellation).toMatchObject({ reason: null, late: false });
    });

    it('rejects an overly long reason', () => {
      expect(() =>
        anAppointment().cancel({ by: 'STAFF', reason: 'x'.repeat(201), now: at('07:00'), policy }),
      ).toThrow(InvalidValueError);
    });
  });

  describe('reschedule', () => {
    it('moves to a new start keeping the duration and asks for confirmation again', () => {
      const confirmed = anAppointment({ duration: minutes(45) }).confirm();
      const moved = confirmed.reschedule({
        start: at('15:00'),
        by: 'STAFF',
        now: at('09:30'),
        policy,
      });
      expect(moved.status).toBe('SCHEDULED');
      expect(moved.start).toEqual(at('15:00'));
      expect(moved.end).toEqual(at('15:45'));
      expect(moved.professionalId).toBe(ids.ricardo);
      expect(moved.id).toBe(confirmed.id);
    });

    it('can move to another professional', () => {
      const moved = anAppointment().reschedule({
        start: at('15:00'),
        professionalId: ids.bruno,
        by: 'STAFF',
        now: at('07:00'),
        policy,
      });
      expect(moved.professionalId).toBe(ids.bruno);
    });

    it('applies the notice policy to clients', () => {
      expect(() =>
        anAppointment().reschedule({ start: at('15:00'), by: 'CLIENT', now: at('08:30'), policy }),
      ).toThrow(LateChangeNotAllowedError);
      const onTime = anAppointment().reschedule({
        start: at('15:00'),
        by: 'CLIENT',
        now: at('07:30'),
        policy,
      });
      expect(onTime.start).toEqual(at('15:00'));
    });
  });

  describe('restore', () => {
    it('round-trips through its props', () => {
      const completed = inStatus('COMPLETED');
      expect(Appointment.restore(completed.toProps())).toEqual(completed);
    });

    it('rejects CANCELLED without cancellation data', () => {
      const props = { ...anAppointment().toProps(), status: 'CANCELLED' as const };
      expect(() => Appointment.restore(props)).toThrow(InvalidValueError);
    });

    it('rejects cancellation data on an active appointment', () => {
      const props = { ...inStatus('CANCELLED').toProps(), status: 'SCHEDULED' as const };
      expect(() => Appointment.restore(props)).toThrow(InvalidValueError);
    });

    it('rejects COMPLETED without a service record', () => {
      const props = { ...anAppointment().toProps(), status: 'COMPLETED' as const };
      expect(() => Appointment.restore(props)).toThrow(InvalidValueError);
    });
  });
});

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the action to throw.');
}
