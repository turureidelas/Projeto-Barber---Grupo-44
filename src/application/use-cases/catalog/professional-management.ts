import { toId, type ProfessionalId } from '@domain/entities/ids';
import { Professional } from '@domain/entities/Professional';
import type { User } from '@domain/entities/User';
import { InvalidValueError } from '@domain/errors/DomainError';
import { assertPermission, type Permission } from '@domain/services/access-control';
import { WEEKDAYS } from '@domain/value-objects/LocalDate';
import { Percentage } from '@domain/value-objects/Percentage';
import { TimeWindow } from '@domain/value-objects/TimeWindow';
import { WorkSchedule, type WorkScheduleInput } from '@domain/value-objects/WorkSchedule';
import type { ApplicationDependencies } from '../../dependencies';
import type { ProfessionalDetailsDTO, WorkDayDTO } from '../../dto/catalog';
import { requireActor } from '../../services/actor';
import { toProfessionalDetailsDTO } from '../../services/assemblers';
import { requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/** Team ("Equipe") and working hours ("escalas"). Only the owner manages them. */

export interface ProfessionalInput {
  readonly name: string;
  readonly specialty: string | null;
  readonly photoUrl: string | null;
  readonly commissionPercent: number;
}

type Deps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'ids' | 'professionals'>;

async function requireAllowed(deps: Deps, permission: Permission): Promise<User> {
  const actor = await requireActor(deps);
  assertPermission(actor, permission);
  return actor;
}

export class GetProfessional implements UseCase<
  { professionalId: string },
  ProfessionalDetailsDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: { professionalId: string }): Promise<ProfessionalDetailsDTO> {
    const actor = await requireAllowed(this.deps, 'professionals:manage');
    return toProfessionalDetailsDTO(
      await requireProfessional(this.deps, actor, input.professionalId),
    );
  }
}

/** New professionals start without working hours: set them right after with the schedule. */
export class CreateProfessional implements UseCase<ProfessionalInput, ProfessionalDetailsDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: ProfessionalInput): Promise<ProfessionalDetailsDTO> {
    const actor = await requireAllowed(this.deps, 'professionals:manage');
    const professional = Professional.create({
      id: toId<ProfessionalId>(this.deps.ids.next()),
      barbershopId: actor.barbershopId,
      name: input.name,
      specialty: input.specialty,
      photoUrl: input.photoUrl,
      commission: Percentage.of(input.commissionPercent),
      schedule: WorkSchedule.empty(),
      active: true,
    });
    await this.deps.professionals.save(professional);
    return toProfessionalDetailsDTO(professional);
  }
}

export interface UpdateProfessionalInput extends ProfessionalInput {
  readonly professionalId: string;
}

export class UpdateProfessional implements UseCase<
  UpdateProfessionalInput,
  ProfessionalDetailsDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: UpdateProfessionalInput): Promise<ProfessionalDetailsDTO> {
    const actor = await requireAllowed(this.deps, 'professionals:manage');
    const current = await requireProfessional(this.deps, actor, input.professionalId);
    const updated = current.update({
      name: input.name,
      specialty: input.specialty,
      photoUrl: input.photoUrl,
      commission: Percentage.of(input.commissionPercent),
    });
    await this.deps.professionals.save(updated);
    return toProfessionalDetailsDTO(updated);
  }
}

export interface UpdateWorkScheduleInput {
  readonly professionalId: string;
  /** Working days only; weekdays left out become days off. */
  readonly schedule: readonly WorkDayDTO[];
}

/**
 * Changes the weekly hours ("escala"). Existing bookings are kept even if they now fall outside
 * the new hours — the owner reschedules them if needed.
 */
export class UpdateWorkSchedule implements UseCase<
  UpdateWorkScheduleInput,
  ProfessionalDetailsDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: UpdateWorkScheduleInput): Promise<ProfessionalDetailsDTO> {
    const actor = await requireAllowed(this.deps, 'schedules:manage');
    const current = await requireProfessional(this.deps, actor, input.professionalId);
    const updated = current.changeSchedule(scheduleFromDTO(input.schedule));
    await this.deps.professionals.save(updated);
    return toProfessionalDetailsDTO(updated);
  }
}

function scheduleFromDTO(days: readonly WorkDayDTO[]): WorkSchedule {
  const input: WorkScheduleInput = {};
  for (const day of days) {
    const weekday = WEEKDAYS.find((candidate) => candidate === day.weekday);
    if (weekday === undefined || input[weekday]) {
      throw new InvalidValueError('workSchedule', 'each weekday may appear only once');
    }
    input[weekday] = {
      hours: TimeWindow.parse(day.start, day.end),
      breaks: day.breaks.map((pause) => TimeWindow.parse(pause.start, pause.end)),
    };
  }
  return WorkSchedule.create(input);
}

export interface SetProfessionalActiveInput {
  readonly id: string;
  readonly active: boolean;
}

/** Inactive professionals disappear from the agenda and can't be booked; history is kept. */
export class SetProfessionalActive implements UseCase<
  SetProfessionalActiveInput,
  ProfessionalDetailsDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: SetProfessionalActiveInput): Promise<ProfessionalDetailsDTO> {
    const actor = await requireAllowed(this.deps, 'professionals:manage');
    const current = await requireProfessional(this.deps, actor, input.id);
    const updated = input.active ? current.activate() : current.deactivate();
    await this.deps.professionals.save(updated);
    return toProfessionalDetailsDTO(updated);
  }
}
