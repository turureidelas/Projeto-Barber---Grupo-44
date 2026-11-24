import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { assembleAppointment } from '../../services/assemblers';
import { cancelByClient, rescheduleByClient } from '../../services/client-changes';
import { parseInstant } from '../../services/inputs';
import { requireAppointment, requireBarbershop, requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/**
 * Demo shortcut for staff: does what a client does in the client area (cancel or reschedule
 * respecting the policy, leaving a notice in the panel) without signing in as the client.
 * Whoever simulates must take care of that agenda.
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
  return { actor, appointment, barbershop };
}

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
    const { appointment, barbershop } = await loadChange(this.deps, input.appointmentId);
    const cancelled = await cancelByClient(this.deps, appointment, barbershop);
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
    const { actor, appointment, barbershop } = await loadChange(this.deps, input.appointmentId);
    const professional = await requireProfessional(this.deps, actor, appointment.professionalId);
    const moved = await rescheduleByClient(this.deps, {
      appointment,
      professional,
      barbershop,
      start: parseInstant('start', input.start),
    });
    return assembleAppointment(this.deps, barbershop, moved);
  }
}
