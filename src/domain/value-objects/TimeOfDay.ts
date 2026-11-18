import { InvalidValueError } from '../errors/DomainError';
import { requireIntegerInRange } from '../shared/guards';

const MINUTES_PER_HOUR = 60;
const PATTERN = /^(\d{2}):(\d{2})$/;

/** Wall-clock time without a date, from 00:00 to 24:00 (end of day). */
export class TimeOfDay {
  static readonly MINUTES_IN_DAY = 24 * MINUTES_PER_HOUR;

  readonly minutesSinceMidnight: number;

  private constructor(minutesSinceMidnight: number) {
    this.minutesSinceMidnight = minutesSinceMidnight;
  }

  static fromMinutes(minutesSinceMidnight: number): TimeOfDay {
    return new TimeOfDay(
      requireIntegerInRange('timeOfDay', minutesSinceMidnight, 0, TimeOfDay.MINUTES_IN_DAY),
    );
  }

  /** Parses "HH:mm" (e.g. "09:30", "24:00"). */
  static parse(value: string): TimeOfDay {
    const match = PATTERN.exec(value);
    if (!match) {
      throw new InvalidValueError('timeOfDay', 'must use the HH:mm format');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (minutes >= MINUTES_PER_HOUR) {
      throw new InvalidValueError('timeOfDay', 'minutes must be below 60');
    }
    return TimeOfDay.fromMinutes(hours * MINUTES_PER_HOUR + minutes);
  }

  get hours(): number {
    return Math.floor(this.minutesSinceMidnight / MINUTES_PER_HOUR);
  }

  get minutes(): number {
    return this.minutesSinceMidnight % MINUTES_PER_HOUR;
  }

  isBefore(other: TimeOfDay): boolean {
    return this.minutesSinceMidnight < other.minutesSinceMidnight;
  }

  equals(other: TimeOfDay): boolean {
    return this.minutesSinceMidnight === other.minutesSinceMidnight;
  }

  toString(): string {
    return `${pad(this.hours)}:${pad(this.minutes)}`;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
