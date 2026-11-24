import { Appointment } from '@domain/entities/Appointment';
import type { Barbershop } from '@domain/entities/Barbershop';
import type { Client } from '@domain/entities/Client';
import { toId, type AppointmentId } from '@domain/entities/ids';
import type { Professional } from '@domain/entities/Professional';
import type { Service } from '@domain/entities/Service';
import { LocalDate } from '@domain/value-objects/LocalDate';
import { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../dependencies';
import { ResourceInactiveError } from '../errors';
import { loadProfessionalAgenda } from './agenda-loader';
import { dayRange } from './inputs';

type SlotDeps = Pick<
  ApplicationDependencies,
  'clock' | 'appointments' | 'timeBlocks' | 'availability'
>;

export interface FindSlotsInput {
  readonly professional: Professional;
  readonly service: Service;
  /** "yyyy-MM-dd" */
  readonly date: string;
  /** When rescheduling: the appointment being moved does not block its own slot. */
  readonly ignoreAppointmentId?: string | undefined;
}

/** Free start times of a service with a professional on a day (availability engine). */
export async function findAvailableSlots(
  deps: SlotDeps,
  input: FindSlotsInput,
): Promise<TimeRange[]> {
  const { professional, service } = input;
  if (!professional.active || !service.active) {
    return [];
  }
  const date = LocalDate.parse(input.date);
  const agenda = await loadProfessionalAgenda(deps, professional, dayRange(date));
  return deps.availability.listAvailableSlots(agenda, date, service.duration, {
    now: deps.clock.now(),
    ...(input.ignoreAppointmentId && {
      ignoreAppointmentId: toId<AppointmentId>(input.ignoreAppointmentId),
    }),
  });
}

export interface BookInput {
  readonly barbershop: Barbershop;
  readonly professional: Professional;
  readonly service: Service;
  readonly client: Client;
  readonly start: Date;
}

/**
 * Books a client — shared by the panel (staff) and the client area. The availability engine
 * guarantees no double booking.
 */
export async function bookAppointment(
  deps: SlotDeps & Pick<ApplicationDependencies, 'ids'>,
  input: BookInput,
): Promise<Appointment> {
  const { barbershop, professional, service, client } = input;
  if (!professional.active) throw new ResourceInactiveError('professional');
  if (!service.active) throw new ResourceInactiveError('service');
  if (client.isAnonymized) throw new ResourceInactiveError('client');

  const now = deps.clock.now();
  const slot = TimeRange.startingAt(input.start, service.duration);
  const agenda = await loadProfessionalAgenda(deps, professional, slot);
  deps.availability.assertSlotAvailable(agenda, slot, { now });

  const appointment = Appointment.schedule({
    id: toId<AppointmentId>(deps.ids.next()),
    barbershopId: barbershop.id,
    professionalId: professional.id,
    clientId: client.id,
    serviceId: service.id,
    start: slot.start,
    duration: service.duration,
    price: service.price,
    createdAt: now,
  });
  await deps.appointments.save(appointment);
  return appointment;
}
