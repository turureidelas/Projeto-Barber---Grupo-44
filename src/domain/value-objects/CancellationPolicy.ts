import { requireIntegerInRange } from '../shared/guards';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export interface CancellationPolicyProps {
  /** Clients must cancel/reschedule at least this many hours before the start. */
  readonly minNoticeHours: number;
  /** "Cliente faltou" can only be recorded this many minutes after the start. */
  readonly noShowToleranceMinutes: number;
}

export class CancellationPolicy {
  static readonly DEFAULTS: CancellationPolicyProps = {
    minNoticeHours: 2,
    noShowToleranceMinutes: 15,
  };

  readonly minNoticeHours: number;
  readonly noShowToleranceMinutes: number;

  private constructor(props: CancellationPolicyProps) {
    this.minNoticeHours = props.minNoticeHours;
    this.noShowToleranceMinutes = props.noShowToleranceMinutes;
  }

  static create(props: CancellationPolicyProps): CancellationPolicy {
    return new CancellationPolicy({
      minNoticeHours: requireIntegerInRange('minNoticeHours', props.minNoticeHours, 0, 168),
      noShowToleranceMinutes: requireIntegerInRange(
        'noShowToleranceMinutes',
        props.noShowToleranceMinutes,
        0,
        120,
      ),
    });
  }

  static default(): CancellationPolicy {
    return CancellationPolicy.create(CancellationPolicy.DEFAULTS);
  }

  /** Last instant a client can still cancel or reschedule without breaking the policy. */
  changeDeadline(appointmentStart: Date): Date {
    return new Date(appointmentStart.getTime() - this.minNoticeHours * MS_PER_HOUR);
  }

  isLateChange(appointmentStart: Date, now: Date): boolean {
    return now.getTime() > this.changeDeadline(appointmentStart).getTime();
  }

  noShowAllowedFrom(appointmentStart: Date): Date {
    return new Date(appointmentStart.getTime() + this.noShowToleranceMinutes * MS_PER_MINUTE);
  }

  canMarkNoShow(appointmentStart: Date, now: Date): boolean {
    return now.getTime() >= this.noShowAllowedFrom(appointmentStart).getTime();
  }
}
