import { assertCanManageAgendaOf } from '@domain/services/access-control';
import type { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../../dependencies';
import type { SlotDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { findAvailableSlots } from '../../services/booking';
import { requireProfessional, requireService } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface ListAvailableSlotsInput {
  readonly professionalId: string;
  readonly serviceId: string;
  /** "yyyy-MM-dd" */
  readonly date: string;
  /** When rescheduling: the appointment being moved does not block its own slot. */
  readonly ignoreAppointmentId?: string;
}

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'professionals'
  | 'services'
  | 'appointments'
  | 'timeBlocks'
  | 'availability'
>;

/** Free start times for a service on a day — the UI only offers these (no trial and error). */
export class ListAvailableSlots implements UseCase<ListAvailableSlotsInput, SlotDTO[]> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: ListAvailableSlotsInput): Promise<SlotDTO[]> {
    const actor = await requireActor(this.deps);
    const professional = await requireProfessional(this.deps, actor, input.professionalId);
    assertCanManageAgendaOf(actor, professional.id);
    const service = await requireService(this.deps, actor, input.serviceId);
    const slots = await findAvailableSlots(this.deps, {
      professional,
      service,
      date: input.date,
      ignoreAppointmentId: input.ignoreAppointmentId,
    });
    return slots.map(toSlotDTO);
  }
}

export function toSlotDTO(slot: TimeRange): SlotDTO {
  return { start: slot.start.toISOString(), end: slot.end.toISOString() };
}
