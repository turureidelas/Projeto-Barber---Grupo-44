import { InvalidValueError } from '../errors/DomainError';

const COUNTRY_CODE = '55';
const VALID_AREA_CODE = /^[1-9]{2}/;

/** Brazilian phone number (area code + 8 or 9 digits), stored as digits only. */
export class Phone {
  readonly digits: string;

  private constructor(digits: string) {
    this.digits = digits;
  }

  /** Accepts any formatting: "(11) 98765-4321", "+55 11 98765 4321", "11987654321". */
  static parse(input: string): Phone {
    let digits = input.replace(/\D/g, '');
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith(COUNTRY_CODE)) {
      digits = digits.slice(COUNTRY_CODE.length);
    }
    if (digits.length !== 10 && digits.length !== 11) {
      throw new InvalidValueError('phone', 'must have an area code and 8 or 9 digits');
    }
    if (!VALID_AREA_CODE.test(digits)) {
      throw new InvalidValueError('phone', 'has an invalid area code');
    }
    if (digits.length === 11 && digits.charAt(2) !== '9') {
      throw new InvalidValueError('phone', 'mobile numbers must start with 9');
    }
    return new Phone(digits);
  }

  get areaCode(): string {
    return this.digits.slice(0, 2);
  }

  get isMobile(): boolean {
    return this.digits.length === 11;
  }

  /** "(11) 98765-4321" */
  formatted(): string {
    return `(${this.areaCode}) ${this.prefix}-${this.suffix}`;
  }

  /** LGPD-safe version for listings: "(11) *****-4321". */
  masked(): string {
    return `(${this.areaCode}) ${'*'.repeat(this.prefix.length)}-${this.suffix}`;
  }

  equals(other: Phone): boolean {
    return this.digits === other.digits;
  }

  private get prefix(): string {
    return this.digits.slice(2, -4);
  }

  private get suffix(): string {
    return this.digits.slice(-4);
  }
}
