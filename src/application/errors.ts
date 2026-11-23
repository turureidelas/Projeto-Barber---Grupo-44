import {
  DOMAIN_ERROR_CODES,
  isDomainError,
  type DomainErrorCode,
} from '@domain/errors/DomainError';

export const APPLICATION_ERROR_CODES = [
  'NOT_FOUND',
  'NOT_AUTHENTICATED',
  'INVALID_CREDENTIALS',
  'RESOURCE_INACTIVE',
  'ALREADY_EXISTS',
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

/** Every code the UI may need to translate into a friendly message. */
export type ErrorCode = DomainErrorCode | ApplicationErrorCode | 'UNEXPECTED';

/** Errors about the request itself (not a business rule): missing data, session, etc. */
export abstract class ApplicationError extends Error {
  abstract readonly code: ApplicationErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export type ResourceName =
  | 'barbershop'
  | 'user'
  | 'professional'
  | 'service'
  | 'client'
  | 'appointment'
  | 'timeBlock'
  | 'notification';

export class NotFoundError extends ApplicationError {
  readonly code = 'NOT_FOUND';
  readonly resource: ResourceName;

  constructor(resource: ResourceName, id: string) {
    super(`${resource} ${id} was not found.`);
    this.resource = resource;
  }
}

export class NotAuthenticatedError extends ApplicationError {
  readonly code = 'NOT_AUTHENTICATED';

  constructor() {
    super('There is no valid session.');
  }
}

export class InvalidCredentialsError extends ApplicationError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('E-mail or password is incorrect.');
  }
}

/** Tried to book with a professional or service that was deactivated, or an anonymized client. */
export class ResourceInactiveError extends ApplicationError {
  readonly code = 'RESOURCE_INACTIVE';
  readonly resource: 'professional' | 'service' | 'client';

  constructor(resource: 'professional' | 'service' | 'client') {
    super(`This ${resource} is inactive.`);
    this.resource = resource;
  }
}

/** e.g. another client already has this phone number. */
export class AlreadyExistsError extends ApplicationError {
  readonly code = 'ALREADY_EXISTS';
  readonly field: 'phone';

  constructor(field: 'phone') {
    super(`Another record already uses this ${field}.`);
    this.field = field;
  }
}

const KNOWN_CODES: readonly string[] = [...DOMAIN_ERROR_CODES, ...APPLICATION_ERROR_CODES];

/** True for any code the UI knows how to explain (anything else becomes UNEXPECTED). */
export function isKnownErrorCode(value: unknown): value is Exclude<ErrorCode, 'UNEXPECTED'> {
  return typeof value === 'string' && KNOWN_CODES.includes(value);
}

/**
 * A business error reported by the server (HTTP adapters) with one of our stable codes —
 * the UI treats it exactly like the same error raised locally.
 */
export class RemoteError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'RemoteError';
    this.code = code;
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/** Stable code for any thrown value — the UI maps it to a pt-BR message. */
export function errorCodeOf(error: unknown): ErrorCode {
  if (isDomainError(error) || isApplicationError(error) || error instanceof RemoteError) {
    return error.code;
  }
  return 'UNEXPECTED';
}
