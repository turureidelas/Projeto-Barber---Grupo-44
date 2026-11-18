import { isDomainError, type DomainErrorCode } from '@domain/errors/DomainError';

export const APPLICATION_ERROR_CODES = [
  'NOT_FOUND',
  'NOT_AUTHENTICATED',
  'INVALID_CREDENTIALS',
  'RESOURCE_INACTIVE',
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
  'barbershop' | 'user' | 'professional' | 'service' | 'client' | 'appointment' | 'timeBlock';

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

/** Tried to book with a professional or service that was deactivated. */
export class ResourceInactiveError extends ApplicationError {
  readonly code = 'RESOURCE_INACTIVE';
  readonly resource: 'professional' | 'service';

  constructor(resource: 'professional' | 'service') {
    super(`This ${resource} is inactive.`);
    this.resource = resource;
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/** Stable code for any thrown value — the UI maps it to a pt-BR message. */
export function errorCodeOf(error: unknown): ErrorCode {
  if (isDomainError(error) || isApplicationError(error)) {
    return error.code;
  }
  return 'UNEXPECTED';
}
