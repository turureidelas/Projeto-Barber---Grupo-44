import { TZDate } from '@date-fns/tz';
import { InvalidValueError } from '../errors/DomainError';
import { BUSINESS_TIME_ZONE } from './time-zone';
import type { TimeOfDay } from './TimeOfDay';

/** 0 = Sunday … 6 = Saturday (same convention as Date#getDay). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar date without time (e.g. "2026-11-18"), interpreted in the business time zone. */
export class LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static of(year: number, month: number, day: number): LocalDate {
    const probe = new Date(Date.UTC(year, month - 1, day));
    const valid =
      Number.isInteger(year) &&
      year >= 1900 &&
      year <= 9999 &&
      probe.getUTCFullYear() === year &&
      probe.getUTCMonth() === month - 1 &&
      probe.getUTCDate() === day;
    if (!valid) {
      throw new InvalidValueError('date', 'must be a real calendar date');
    }
    return new LocalDate(year, month, day);
  }

  /** Parses "yyyy-MM-dd". */
  static parse(value: string): LocalDate {
    const match = PATTERN.exec(value);
    if (!match) {
      throw new InvalidValueError('date', 'must use the yyyy-MM-dd format');
    }
    return LocalDate.of(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  /** The calendar date an instant falls on, in the given time zone. */
  static fromInstant(instant: Date, timeZone: string = BUSINESS_TIME_ZONE): LocalDate {
    const zoned = new TZDate(instant.getTime(), timeZone);
    return LocalDate.of(zoned.getFullYear(), zoned.getMonth() + 1, zoned.getDate());
  }

  get weekday(): Weekday {
    return new Date(Date.UTC(this.year, this.month - 1, this.day)).getUTCDay() as Weekday;
  }

  /** The instant this date reaches `time` on the wall clock of `timeZone`. */
  at(time: TimeOfDay, timeZone: string = BUSINESS_TIME_ZONE): Date {
    const zoned = new TZDate(
      this.year,
      this.month - 1,
      this.day,
      time.hours,
      time.minutes,
      timeZone,
    );
    return new Date(zoned.getTime());
  }

  addDays(days: number): LocalDate {
    const shifted = new Date(Date.UTC(this.year, this.month - 1, this.day + days));
    return LocalDate.of(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }

  compare(other: LocalDate): number {
    return this.toString().localeCompare(other.toString());
  }

  isBefore(other: LocalDate): boolean {
    return this.compare(other) < 0;
  }

  equals(other: LocalDate): boolean {
    return this.compare(other) === 0;
  }

  toString(): string {
    const month = String(this.month).padStart(2, '0');
    const day = String(this.day).padStart(2, '0');
    return `${this.year}-${month}-${day}`;
  }
}
