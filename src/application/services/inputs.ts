import { requireValidDate } from '@domain/shared/guards';
import type { LocalDate } from '@domain/value-objects/LocalDate';
import { TimeOfDay } from '@domain/value-objects/TimeOfDay';
import { TimeRange } from '@domain/value-objects/TimeRange';

/** Parses an ISO 8601 instant coming from the UI; throws InvalidValueError if malformed. */
export function parseInstant(field: string, iso: string): Date {
  return requireValidDate(field, new Date(iso));
}

const MIDNIGHT = TimeOfDay.fromMinutes(0);

/** The whole calendar day [00:00, next day 00:00) in the business time zone. */
export function dayRange(date: LocalDate): TimeRange {
  return TimeRange.create(date.at(MIDNIGHT), date.addDays(1).at(MIDNIGHT));
}
