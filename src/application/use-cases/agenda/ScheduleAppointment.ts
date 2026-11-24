import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { assembleAppointment } from '../../services/assemblers';
import { bookAppointment } from '../../services/booking';
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
    const appointment = await bookAppointment(this.deps, {
      barbershop,
      professional,
      service,
      client,
      start: parseInstant('start', input.start),
    });
    return assembleAppointment(this.deps, barbershop, appointment);
  }
}
