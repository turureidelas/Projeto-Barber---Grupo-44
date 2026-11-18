import { toId, type TimeBlockId } from '@domain/entities/ids';
import { TimeBlock } from '@domain/entities/TimeBlock';
import { assertCanManageTimeBlocksOf } from '@domain/services/access-control';
import { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../../dependencies';
import type { TimeBlockDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { loadProfessionalAgenda } from '../../services/agenda-loader';
import { toTimeBlockDTO } from '../../services/assemblers';
import { parseInstant } from '../../services/inputs';
import { requireProfessional, requireTimeBlock } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface BlockTimeInput {
  readonly professionalId: string;
  readonly start: string;
  readonly end: string;
  readonly reason: string | null;
}

type BlockDeps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'ids'
  | 'professionals'
  | 'appointments'
  | 'timeBlocks'
  | 'availability'
>;

/** "Bloquear horário" — refuses to cover active appointments. */
export class BlockTime implements UseCase<BlockTimeInput, TimeBlockDTO> {
  private readonly deps: BlockDeps;

  constructor(deps: BlockDeps) {
    this.deps = deps;
  }

  async execute(input: BlockTimeInput): Promise<TimeBlockDTO> {
    const actor = await requireActor(this.deps);
    const professional = await requireProfessional(this.deps, actor, input.professionalId);
    assertCanManageTimeBlocksOf(actor, professional.id);

    const now = this.deps.clock.now();
    const range = TimeRange.create(
      parseInstant('start', input.start),
      parseInstant('end', input.end),
    );
    const agenda = await loadProfessionalAgenda(this.deps, professional, range);
    this.deps.availability.assertCanBlock(agenda, range, { now });

    const block = TimeBlock.create({
      id: toId<TimeBlockId>(this.deps.ids.next()),
      barbershopId: professional.barbershopId,
      professionalId: professional.id,
      range,
      reason: input.reason,
      createdBy: actor.id,
      createdAt: now,
    });
    await this.deps.timeBlocks.save(block);
    return toTimeBlockDTO(block);
  }
}

export interface UnblockTimeInput {
  readonly timeBlockId: string;
}

type UnblockDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'timeBlocks'>;

/** "Liberar horário" — deletes the block; the time is bookable again. */
export class UnblockTime implements UseCase<UnblockTimeInput, void> {
  private readonly deps: UnblockDeps;

  constructor(deps: UnblockDeps) {
    this.deps = deps;
  }

  async execute(input: UnblockTimeInput): Promise<void> {
    const actor = await requireActor(this.deps);
    const block = await requireTimeBlock(this.deps, actor, input.timeBlockId);
    assertCanManageTimeBlocksOf(actor, block.professionalId);
    await this.deps.timeBlocks.delete(block.id);
  }
}
