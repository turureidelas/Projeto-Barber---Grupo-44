import { InvalidValueError } from '../errors/DomainError';
import { TimeOfDay } from './TimeOfDay';

/** Half-open wall-clock window [start, end) within a single day, e.g. 09:00–12:00. */
export class TimeWindow {
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;

  private constructor(start: TimeOfDay, end: TimeOfDay) {
    this.start = start;
    this.end = end;
  }

  static create(start: TimeOfDay, end: TimeOfDay): TimeWindow {
    if (!start.isBefore(end)) {
      throw new InvalidValueError('timeWindow', 'start must be before end');
    }
    return new TimeWindow(start, end);
  }

  /** Convenience: TimeWindow.parse("09:00", "12:00"). */
  static parse(start: string, end: string): TimeWindow {
    return TimeWindow.create(TimeOfDay.parse(start), TimeOfDay.parse(end));
  }

  get durationMinutes(): number {
    return this.end.minutesSinceMidnight - this.start.minutesSinceMidnight;
  }

  overlaps(other: TimeWindow): boolean {
    return this.start.isBefore(other.end) && other.start.isBefore(this.end);
  }

  contains(other: TimeWindow): boolean {
    return !other.start.isBefore(this.start) && !this.end.isBefore(other.end);
  }

  /** What is left of this window after removing `others` (e.g. working hours minus breaks). */
  subtract(others: readonly TimeWindow[]): TimeWindow[] {
    const sorted = [...others].sort(
      (a, b) => a.start.minutesSinceMidnight - b.start.minutesSinceMidnight,
    );
    const remaining: TimeWindow[] = [];
    let cursor = this.start;

    for (const other of sorted) {
      if (!other.overlaps(this)) continue;
      if (cursor.isBefore(other.start)) {
        remaining.push(new TimeWindow(cursor, other.start));
      }
      if (cursor.isBefore(other.end)) {
        cursor = other.end;
      }
    }
    if (cursor.isBefore(this.end)) {
      remaining.push(new TimeWindow(cursor, this.end));
    }
    return remaining;
  }

  equals(other: TimeWindow): boolean {
    return this.start.equals(other.start) && this.end.equals(other.end);
  }

  toString(): string {
    return `${this.start.toString()}–${this.end.toString()}`;
  }
}
