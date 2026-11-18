import { InvalidValueError } from '../errors/DomainError';

/** Trims and validates a required text field. */
export function requireText(field: string, value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new InvalidValueError(field, 'must not be empty');
  }
  if (trimmed.length > maxLength) {
    throw new InvalidValueError(field, `must have at most ${maxLength} characters`);
  }
  return trimmed;
}

/** Trims an optional text field; blank becomes null. */
export function optionalText(
  field: string,
  value: string | null,
  maxLength: number,
): string | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  return requireText(field, value, maxLength);
}

export function requireIntegerInRange(
  field: string,
  value: number,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new InvalidValueError(field, `must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function requireValidDate(field: string, value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    throw new InvalidValueError(field, 'must be a valid date');
  }
  return new Date(value.getTime());
}
