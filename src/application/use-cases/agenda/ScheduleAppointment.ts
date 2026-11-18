import { Appointment } from '@domain/entities/Appointment';
import { toId, type AppointmentId } from '@domain/entities/ids';
import { assertCanManageAgendaOf } from '@domain/services/access-control';
import { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { ResourceInactiveError } from '../../errors';
import { requireActor } from '../../services/actor';
import { loadProfessionalAgenda } from '../../services/agenda-loader';
import { assembleAppointment } from '../../services/assemblers';
import { parseInstant } from '../../services/inputs';
import {
  requireBarbershop,
  requireClient,
  requireProfessional,
  requireService,
} from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface ScheduleAppointmentInput {
  readonly professionalId: string;
  readonly clientId: string;
  readonly serviceId: string;
  /** ISO 8601 instant */
  readonly start: string;
}

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
>;

/** Books a client. The availability engine guarantees no double booking. */
export class ScheduleAppointment implements UseCase<ScheduleAppointmentInput, AppointmentDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: ScheduleAppointmentInput): Promise<AppointmentDTO> {
    const actor = await requireActor(this.deps);
    const professional = await requireProfessional(this.deps, actor, input.professionalId);
    assertCanManageAgendaOf(actor, professional.id);
    const [barbershop, service, client] = await Promise.all([
      requireBarbershop(this.deps, actor),
      requireService(this.deps, actor, input.serviceId),
      requireClient(this.deps, actor, input.clientId),
    ]);
    if (!professional.active) throw new ResourceInactiveError('professional');
    if (!service.active) throw new ResourceInactiveError('service');

    const now = this.deps.clock.now();
    const slot = TimeRange.startingAt(parseInstant('start', input.start), service.duration);
    const agenda = await loadProfessionalAgenda(this.deps, professional, slot);
    this.deps.availability.assertSlotAvailable(agenda, slot, { now });

    const appointment = Appointment.schedule({
      id: toId<AppointmentId>(this.deps.ids.next()),
      barbershopId: barbershop.id,
      professionalId: professional.id,
      clientId: client.id,
      serviceId: service.id,
      start: slot.start,
      duration: service.duration,
      price: service.price,
      createdAt: now,
    });
    await this.deps.appointments.save(appointment);
    return assembleAppointment(this.deps, barbershop, appointment);
  }
}
