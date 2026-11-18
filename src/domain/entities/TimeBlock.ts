import { optionalText } from '../shared/guards';
import type { TimeRange } from '../value-objects/TimeRange';
import type { BarbershopId, ProfessionalId, TimeBlockId, UserId } from './ids';

const MAX_REASON_LENGTH = 120;

export interface TimeBlockProps {
  readonly id: TimeBlockId;
  readonly barbershopId: BarbershopId;
  readonly professionalId: ProfessionalId;
  readonly range: TimeRange;
  /** Optional note, e.g. "Médico". */
  readonly reason: string | null;
  readonly createdBy: UserId;
  readonly createdAt: Date;
}

/** "Bloquear horário": time a professional is unavailable. Freeing it = deleting the block. */
export class TimeBlock {
  readonly id: TimeBlockId;
  readonly barbershopId: BarbershopId;
  readonly professionalId: ProfessionalId;
  readonly range: TimeRange;
  readonly reason: string | null;
  readonly createdBy: UserId;
  readonly createdAt: Date;

  private constructor(props: TimeBlockProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.professionalId = props.professionalId;
    this.range = props.range;
    this.reason = props.reason;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  static create(props: TimeBlockProps): TimeBlock {
    return new TimeBlock({
      ...props,
      reason: optionalText('timeBlockReason', props.reason, MAX_REASON_LENGTH),
    });
  }
}
