import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { ResourceInactiveError } from '../../errors';
import { requireActor } from '../../services/actor';
import { loadProfessionalAgenda } from '../../services/agenda-loader';
import { assembleAppointment } from '../../services/assemblers';
import { parseInstant } from '../../services/inputs';
import { requireAppointment, requireBarbershop, requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface RescheduleAppointmentInput {
  readonly appointmentId: string;
  /** New start, ISO 8601. Duration is kept. */
  readonly start: string;
  /** Move to another professional (defaults to the current one). */
  readonly professionalId?: string;
}

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'barbershops'
  | 'professionals'
  | 'services'
  | 'clients'
  | 'appointments'
  | 'timeBlocks'
  | 'availability'
>;

/** Moves an appointment. The previous time is freed as soon as it is saved. */
export class RescheduleAppointment implements UseCase<RescheduleAppointmentInput, AppointmentDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: RescheduleAppointmentInput): Promise<AppointmentDTO> {
    const actor = await requireActor(this.deps);
    const appointment = await requireAppointment(this.deps, actor, input.appointmentId);
    assertCanManageAgendaOf(actor, appointment.professionalId);

    const target = await requireProfessional(
      this.deps,
      actor,
      input.professionalId ?? appointment.professionalId,
    );
    assertCanManageAgendaOf(actor, target.id);
    if (!target.active) throw new ResourceInactiveError('professional');

    const barbershop = await requireBarbershop(this.deps, actor);
    const now = this.deps.clock.now();
    const moved = appointment.reschedule({
      start: parseInstant('start', input.start),
      professionalId: target.id,
      by: 'STAFF',
      now,
      policy: barbershop.cancellationPolicy,
    });

    const agenda = await loadProfessionalAgenda(this.deps, target, moved.range);
    this.deps.availability.assertSlotAvailable(agenda, moved.range, {
      now,
      ignoreAppointmentId: appointment.id,
    });

    await this.deps.appointments.save(moved);
    return assembleAppointment(this.deps, barbershop, moved);
  }
}
