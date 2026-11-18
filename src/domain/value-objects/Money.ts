import { InvalidValueError } from '../errors/DomainError';
import type { Percentage } from './Percentage';

/** Amount in BRL stored as integer cents — never floating point. */
export class Money {
  readonly cents: number;

  private constructor(cents: number) {
    this.cents = cents;
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new InvalidValueError('money', 'must be an integer number of cents');
    }
    if (cents < 0) {
      throw new InvalidValueError('money', 'must not be negative');
    }
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  static sum(values: readonly Money[]): Money {
    return values.reduce<Money>((total, value) => total.add(value), Money.zero());
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  /** Share of this amount, rounded half-up to the nearest cent. */
  percentage(percent: Percentage): Money {
    return new Money(Math.round((this.cents * percent.value) / 100));
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
