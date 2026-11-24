import type { Appointment } from '@domain/entities/Appointment';
import type { Barbershop } from '@domain/entities/Barbershop';
import { toId, type NotificationId } from '@domain/entities/ids';
import { Notification } from '@domain/entities/Notification';
import type { Professional } from '@domain/entities/Professional';
import type { ApplicationDependencies } from '../dependencies';
import { moveAppointment } from './appointment-changes';

/**
 * Changes made by the client themselves (client area, or the demo simulator): they respect
 * the notice period (out of it → LATE_CHANGE_NOT_ALLOWED), free the previous time and leave
 * a notice in the panel. Changes made by the staff don't come through here.
 */

type Deps = Pick<
  ApplicationDependencies,
  'clock' | 'ids' | 'appointments' | 'timeBlocks' | 'availability' | 'notifications'
>;

const newNotificationId = (deps: Deps) => toId<NotificationId>(deps.ids.next());

export async function cancelByClient(
  deps: Deps,
  appointment: Appointment,
  barbershop: Barbershop,
): Promise<Appointment> {
  const now = deps.clock.now();
  const cancelled = appointment.cancel({
    by: 'CLIENT',
    reason: null,
    now,
    policy: barbershop.cancellationPolicy,
  });
  await deps.appointments.save(cancelled);
  await deps.notifications.save(
    Notification.clientCancelled(cancelled, { id: newNotificationId(deps), now }),
  );
  return cancelled;
}

/** Same professional, only free times (availability engine). */
export async function rescheduleByClient(
  deps: Deps,
  input: {
    readonly appointment: Appointment;
    readonly professional: Professional;
    readonly barbershop: Barbershop;
    readonly start: Date;
  },
): Promise<Appointment> {
  const now = deps.clock.now();
  const moved = await moveAppointment(deps, {
    appointment: input.appointment,
    target: input.professional,
    start: input.start,
    by: 'CLIENT',
    now,
    policy: input.barbershop.cancellationPolicy,
  });
  await deps.notifications.save(
    Notification.clientRescheduled(input.appointment, moved, { id: newNotificationId(deps), now }),
  );
  return moved;
}

/** A new booking made by the client: the panel gets a notice. */
export async function notifyClientBooking(deps: Deps, appointment: Appointment): Promise<void> {
  await deps.notifications.save(
    Notification.clientBooked(appointment, { id: newNotificationId(deps), now: deps.clock.now() }),
  );
}
