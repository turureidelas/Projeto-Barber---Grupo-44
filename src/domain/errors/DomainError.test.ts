import { describe, expect, it } from 'vitest';
import { PermissionDeniedError } from './access-errors';
import {
  CancellationReasonRequiredError,
  InvalidStatusTransitionError,
  LateChangeNotAllowedError,
  NoShowTooEarlyError,
} from './appointment-errors';
import {
  DOMAIN_ERROR_CODES,
  InvalidValueError,
  isDomainError,
  type DomainError,
} from './DomainError';
import {
  OutsideWorkingHoursError,
  ScheduleConflictError,
  SlotInPastError,
  TimeBlockedError,
} from './scheduling-errors';

describe('DomainError', () => {
  const all: DomainError[] = [
    new InvalidValueError('phone', 'too short'),
    new SlotInPastError(),
    new OutsideWorkingHoursError(),
    new TimeBlockedError('block-1'),
    new ScheduleConflictError('appt-1'),
    new InvalidStatusTransitionError('COMPLETED', 'cancel'),
    new LateChangeNotAllowedError('cancel', 2),
    new CancellationReasonRequiredError(),
    new NoShowTooEarlyError(new Date('2026-11-18T13:15:00Z')),
    new PermissionDeniedError('settings:manage'),
  ];

  it('covers every declared code exactly once', () => {
    expect(all.map((error) => error.code).sort()).toEqual([...DOMAIN_ERROR_CODES].sort());
  });

  it.each(all.map((error) => [error.name, error] as const))(
    '%s is a recognizable Error',
    (name, error) => {
      expect(error).toBeInstanceOf(Error);
      expect(isDomainError(error)).toBe(true);
      expect(error.name).toBe(name);
      expect(error.message).not.toBe('');
    },
  );

  it('does not treat other errors as domain errors', () => {
    expect(isDomainError(new Error('boom'))).toBe(false);
    expect(isDomainError('boom')).toBe(false);
  });

  it('keeps the invalid field and reason', () => {
    expect(new InvalidValueError('phone', 'too short')).toMatchObject({
      field: 'phone',
      reason: 'too short',
    });
  });
});
