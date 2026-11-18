import type { Professional } from '@domain/entities/Professional';
import type { ProfessionalAgenda } from '@domain/services/AvailabilityService';
import type { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../dependencies';

/** Loads what the availability engine needs: the professional's bookings and blocks around `range`. */
export async function loadProfessionalAgenda(
  deps: Pick<ApplicationDependencies, 'appointments' | 'timeBlocks'>,
  professional: Professional,
  range: TimeRange,
): Promise<ProfessionalAgenda> {
  const query = {
    barbershopId: professional.barbershopId,
    professionalId: professional.id,
    range,
  };
  const [appointments, timeBlocks] = await Promise.all([
    deps.appointments.listInRange(query),
    deps.timeBlocks.listInRange(query),
  ]);
  return {
    professionalId: professional.id,
    schedule: professional.schedule,
    appointments,
    timeBlocks,
  };
}
