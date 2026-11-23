import type { Appointment, ChangeRequestedBy } from '@domain/entities/Appointment';
import type { Professional } from '@domain/entities/Professional';
import type { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import type { ApplicationDependencies } from '../dependencies';
import { loadProfessionalAgenda } from './agenda-loader';

export interface MoveAppointmentInput {
  readonly appointment: Appointment;
  readonly target: Professional;
  readonly start: Date;
  readonly by: ChangeRequestedBy;
  readonly now: Date;
  readonly policy: CancellationPolicy;
}

/**
 * Reschedule shared by the panel (staff) and the client app: domain rules (status, notice
 * period for clients) + availability engine, then save. The previous time is freed at once.
 */
export async function moveAppointment(
  deps: Pick<ApplicationDependencies, 'appointments' | 'timeBlocks' | 'availability'>,
  input: MoveAppointmentInput,
): Promise<Appointment> {
  const { appointment, target, now } = input;
  const moved = appointment.reschedule({
    start: input.start,
    professionalId: target.id,
    by: input.by,
    now,
    policy: input.policy,
  });
  const agenda = await loadProfessionalAgenda(deps, target, moved.range);
  deps.availability.assertSlotAvailable(agenda, moved.range, {
    now,
    ignoreAppointmentId: appointment.id,
  });
  await deps.appointments.save(moved);
  return moved;
}
