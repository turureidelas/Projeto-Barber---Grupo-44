/**
 * Every business-rule violation is a typed DomainError with a stable `code`.
 * The UI maps codes to friendly pt-BR messages; `message` is developer-facing only.
 */
export const DOMAIN_ERROR_CODES = [
  'INVALID_VALUE',
  'SLOT_IN_PAST',
  'OUTSIDE_WORKING_HOURS',
  'TIME_BLOCKED',
  'SCHEDULE_CONFLICT',
  'INVALID_STATUS_TRANSITION',
  'LATE_CHANGE_NOT_ALLOWED',
  'CANCELLATION_REASON_REQUIRED',
  'NO_SHOW_TOO_EARLY',
  'PERMISSION_DENIED',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export class InvalidValueError extends DomainError {
  readonly code = 'INVALID_VALUE';
  readonly field: string;
  readonly reason: string;

  constructor(field: string, reason: string) {
    super(`Invalid ${field}: ${reason}.`);
    this.field = field;
    this.reason = reason;
  }
}
