import type { Appointment } from '@domain/entities/Appointment';
import { isActiveStatus } from '@domain/entities/AppointmentStatus';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO, SlotDTO } from '../../dto/agenda';
import type { MyAppointmentsDTO } from '../../dto/client-area';
import { NotFoundError } from '../../errors';
import { requireClientActor, type ClientActor } from '../../services/actor';
import { assembleAppointment, assembleAppointments } from '../../services/assemblers';
import { bookAppointment, findAvailableSlots } from '../../services/booking';
import {
  cancelByClient,
  notifyClientBooking,
  rescheduleByClient,
} from '../../services/client-changes';
import { parseInstant } from '../../services/inputs';
import {
  requireAppointment,
  requireBarbershop,
  requireClient,
  requireProfessional,
  requireService,
} from '../../services/lookups';
import { toSlotDTO } from '../agenda/ListAvailableSlots';
import type { UseCase } from '../UseCase';

/**
 * The client area: a signed-in client books, cancels and reschedules only their own
 * appointments. Someone else's appointment answers NOT_FOUND (nothing leaks).
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

async function requireOwnAppointment(
  deps: Deps,
  actor: ClientActor,
  appointmentId: string,
): Promise<Appointment> {
  const appointment = await requireAppointment(deps, actor.user, appointmentId);
  if (appointment.clientId !== actor.clientId) {
    throw new NotFoundError('appointment', appointmentId);
  }
  return appointment;
}

/** "Meus horários": upcoming and past appointments of the signed-in client. */
export class GetMyAppointments implements UseCase<void, MyAppointmentsDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(): Promise<MyAppointmentsDTO> {
    const actor = await requireClientActor(this.deps);
    const barbershop = await requireBarbershop(this.deps, actor.user);
    const appointments = await this.deps.appointments.listByClient(actor.clientId);
    const all = await assembleAppointments(this.deps, barbershop, appointments);
    const now = this.deps.clock.now().getTime();
    const isUpcoming = (item: AppointmentDTO) =>
      isActiveStatus(item.status) && Date.parse(item.end) > now;

    return {
      upcoming: all.filter(isUpcoming),
      past: all.filter((item) => !isUpcoming(item)).reverse(),
    };
  }
}

export interface ClientSlotsInput {
  readonly professionalId: string;
  readonly serviceId: string;
  /** "yyyy-MM-dd" */
  readonly date: string;
  /** When rescheduling one of the client's own appointments. */
  readonly ignoreAppointmentId?: string;
}

/** Free times the client can pick (availability engine) — never an invalid one. */
export class ListClientSlots implements UseCase<ClientSlotsInput, SlotDTO[]> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: ClientSlotsInput): Promise<SlotDTO[]> {
    const actor = await requireClientActor(this.deps);
    const [professional, service] = await Promise.all([
      requireProfessional(this.deps, actor.user, input.professionalId),
      requireService(this.deps, actor.user, input.serviceId),
    ]);
    if (input.ignoreAppointmentId) {
      await requireOwnAppointment(this.deps, actor, input.ignoreAppointmentId);
    }
    const slots = await findAvailableSlots(this.deps, {
      professional,
      service,
      date: input.date,
      ignoreAppointmentId: input.ignoreAppointmentId,
    });
    return slots.map(toSlotDTO);
  }
}

export interface BookMyAppointmentInput {
  readonly professionalId: string;
  readonly serviceId: string;
  /** ISO 8601 instant */
  readonly start: string;
}

/** "Agendar": the client books for themselves; the panel gets a notice. */
export class BookMyAppointment implements UseCase<BookMyAppointmentInput, AppointmentDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: BookMyAppointmentInput): Promise<AppointmentDTO> {
    const actor = await requireClientActor(this.deps);
    const [barbershop, professional, service, client] = await Promise.all([
      requireBarbershop(this.deps, actor.user),
      requireProfessional(this.deps, actor.user, input.professionalId),
      requireService(this.deps, actor.user, input.serviceId),
      requireClient(this.deps, actor.user, actor.clientId),
    ]);
    const appointment = await bookAppointment(this.deps, {
      barbershop,
      professional,
      service,
      client,
      start: parseInstant('start', input.start),
    });
    await notifyClientBooking(this.deps, appointment);
    return assembleAppointment(this.deps, barbershop, appointment);
  }
}

export interface MyAppointmentInput {
  readonly appointmentId: string;
}

/** The client cancels within the notice period (LATE_CHANGE_NOT_ALLOWED otherwise). */
export class CancelMyAppointment implements UseCase<MyAppointmentInput, AppointmentDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: MyAppointmentInput): Promise<AppointmentDTO> {
    const actor = await requireClientActor(this.deps);
    const appointment = await requireOwnAppointment(this.deps, actor, input.appointmentId);
    const barbershop = await requireBarbershop(this.deps, actor.user);
    const cancelled = await cancelByClient(this.deps, appointment, barbershop);
    return assembleAppointment(this.deps, barbershop, cancelled);
  }
}

export interface RescheduleMyAppointmentInput extends MyAppointmentInput {
  /** New start (ISO 8601), with the same professional. */
  readonly start: string;
}

/** The client moves their appointment to another free time with the same professional. */
export class RescheduleMyAppointment implements UseCase<
  RescheduleMyAppointmentInput,
  AppointmentDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: RescheduleMyAppointmentInput): Promise<AppointmentDTO> {
    const actor = await requireClientActor(this.deps);
    const appointment = await requireOwnAppointment(this.deps, actor, input.appointmentId);
    const [barbershop, professional] = await Promise.all([
      requireBarbershop(this.deps, actor.user),
      requireProfessional(this.deps, actor.user, appointment.professionalId),
    ]);
    const moved = await rescheduleByClient(this.deps, {
      appointment,
      professional,
      barbershop,
      start: parseInstant('start', input.start),
    });
    return assembleAppointment(this.deps, barbershop, moved);
  }
}
