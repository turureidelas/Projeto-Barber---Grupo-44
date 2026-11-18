import { InvalidValueError } from '../errors/DomainError';
import { requireValidDate } from '../shared/guards';
import type { Duration } from './Duration';

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * Half-open interval of real instants [start, end).
 * Ending at 10:00 and starting at 10:00 do NOT overlap.
 */
export class TimeRange {
  private readonly startMs: number;
  private readonly endMs: number;

  private constructor(startMs: number, endMs: number) {
    this.startMs = startMs;
    this.endMs = endMs;
  }

  static create(start: Date, end: Date): TimeRange {
    const startMs = requireValidDate('rangeStart', start).getTime();
    const endMs = requireValidDate('rangeEnd', end).getTime();
    if (startMs >= endMs) {
      throw new InvalidValueError('timeRange', 'start must be before end');
    }
    return new TimeRange(startMs, endMs);
  }

  static startingAt(start: Date, duration: Duration): TimeRange {
    return TimeRange.create(start, new Date(start.getTime() + duration.milliseconds));
  }

  get start(): Date {
    return new Date(this.startMs);
  }

  get end(): Date {
    return new Date(this.endMs);
  }

  get durationMinutes(): number {
    return Math.round((this.endMs - this.startMs) / MILLISECONDS_PER_MINUTE);
  }

  overlaps(other: TimeRange): boolean {
    return this.startMs < other.endMs && other.startMs < this.endMs;
  }

  contains(other: TimeRange): boolean {
    return this.startMs <= other.startMs && other.endMs <= this.endMs;
  }

  startsBefore(instant: Date): boolean {
    return this.startMs < instant.getTime();
  }

  equals(other: TimeRange): boolean {
    return this.startMs === other.startMs && this.endMs === other.endMs;
  }
}
