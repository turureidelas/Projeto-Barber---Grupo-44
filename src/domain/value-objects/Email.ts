import { InvalidValueError } from '../errors/DomainError';

const MAX_LENGTH = 254;
const PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail address, normalized to trimmed lowercase. */
export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static parse(input: string): Email {
    const normalized = input.trim().toLowerCase();
    if (normalized.length > MAX_LENGTH || !PATTERN.test(normalized)) {
      throw new InvalidValueError('email', 'must be a valid e-mail address');
    }
    return new Email(normalized);
  }

  /** LGPD-safe version for listings: "r***@gmail.com". */
  masked(): string {
    const at = this.value.indexOf('@');
    return `${this.value.charAt(0)}***${this.value.slice(at)}`;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
