import { requireIntegerInRange } from '../shared/guards';

const MILLISECONDS_PER_MINUTE = 60_000;

/** Length of a service or appointment, in whole minutes. */
export class Duration {
  static readonly MAX_MINUTES = 12 * 60;

  readonly minutes: number;

  private constructor(minutes: number) {
    this.minutes = minutes;
  }

  static ofMinutes(minutes: number): Duration {
    return new Duration(requireIntegerInRange('duration', minutes, 1, Duration.MAX_MINUTES));
  }

  get milliseconds(): number {
    return this.minutes * MILLISECONDS_PER_MINUTE;
  }

  plus(other: Duration): Duration {
    return Duration.ofMinutes(this.minutes + other.minutes);
  }

  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }
}
