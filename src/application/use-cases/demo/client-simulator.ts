import { toId, type NotificationId } from '@domain/entities/ids';
import { Notification } from '@domain/entities/Notification';
import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { moveAppointment } from '../../services/appointment-changes';
import { assembleAppointment } from '../../services/assemblers';
import { parseInstant } from '../../services/inputs';
import { requireAppointment, requireBarbershop, requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/**
 * What the client app will do through the API: cancel or reschedule respecting the policy
 * (out of the notice period → LATE_CHANGE_NOT_ALLOWED), freeing the previous time and leaving
 * a notice in the panel. The client app doesn't exist yet, so in demo mode the panel offers a
 * simulator; whoever simulates must take care of that agenda.
 */

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'ids'
  | 'barbershops'
  | 'professionals'
  | 'services'
  | 'clients'
  | 'appointments'
  | 'timeBlocks'
  | 'availability'
  | 'notifications'
>;

async function loadChange(deps: Deps, appointmentId: string) {
  const actor = await requireActor(deps);
  const appointment = await requireAppointment(deps, actor, appointmentId);
  assertCanManageAgendaOf(actor, appointment.professionalId);
  const barbershop = await requireBarbershop(deps, actor);
  return { actor, appointment, barbershop, now: deps.clock.now() };
}

const newNotificationId = (deps: Deps) => toId<NotificationId>(deps.ids.next());

export interface SimulateClientCancelInput {
  readonly appointmentId: string;
}

/** "Cliente cancelou". */
export class SimulateClientCancel implements UseCase<SimulateClientCancelInput, AppointmentDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: SimulateClientCancelInput): Promise<AppointmentDTO> {
    const { appointment, barbershop, now } = await loadChange(this.deps, input.appointmentId);
    const cancelled = appointment.cancel({
      by: 'CLIENT',
      reason: null,
      now,
      policy: barbershop.cancellationPolicy,
    });
    await this.deps.appointments.save(cancelled);
    await this.deps.notifications.save(
      Notification.clientCancelled(cancelled, { id: newNotificationId(this.deps), now }),
    );
    return assembleAppointment(this.deps, barbershop, cancelled);
  }
}

export interface SimulateClientRescheduleInput {
  readonly appointmentId: string;
  /** New start (ISO 8601), with the same professional. */
  readonly start: string;
}

/** "Cliente remarcou" — same professional, only free times (availability engine). */
export class SimulateClientReschedule implements UseCase<
  SimulateClientRescheduleInput,
  AppointmentDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: SimulateClientRescheduleInput): Promise<AppointmentDTO> {
    const { actor, appointment, barbershop, now } = await loadChange(
      this.deps,
      input.appointmentId,
    );
    const professional = await requireProfessional(this.deps, actor, appointment.professionalId);
    const moved = await moveAppointment(this.deps, {
      appointment,
      target: professional,
      start: parseInstant('start', input.start),
      by: 'CLIENT',
      now,
      policy: barbershop.cancellationPolicy,
    });
    await this.deps.notifications.save(
      Notification.clientRescheduled(appointment, moved, { id: newNotificationId(this.deps), now }),
    );
    return assembleAppointment(this.deps, barbershop, moved);
  }
}
