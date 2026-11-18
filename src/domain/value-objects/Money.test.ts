import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { Money } from './Money';
import { Percentage } from './Percentage';

describe('Money', () => {
  it('stores integer cents', () => {
    expect(Money.fromCents(4500).cents).toBe(4500);
    expect(Money.zero().isZero()).toBe(true);
  });

  it.each([
    ['fractional cents', 10.5],
    ['negative amounts', -1],
    ['unsafe integers', Number.MAX_SAFE_INTEGER + 1],
    ['NaN', Number.NaN],
  ])('rejects %s', (_label, cents) => {
    expect(() => Money.fromCents(cents)).toThrow(InvalidValueError);
  });

  it('adds and sums', () => {
    expect(Money.fromCents(4500).add(Money.fromCents(2500)).cents).toBe(7000);
    expect(Money.sum([Money.fromCents(100), Money.fromCents(250), Money.fromCents(5)]).cents).toBe(
      355,
    );
    expect(Money.sum([]).isZero()).toBe(true);
  });

  it('calculates a percentage rounding half-up to the cent', () => {
    expect(Money.fromCents(4500).percentage(Percentage.of(40)).cents).toBe(1800);
    expect(Money.fromCents(4555).percentage(Percentage.of(33)).cents).toBe(1503); // 1503.15
    expect(Money.fromCents(1).percentage(Percentage.of(50)).cents).toBe(1); // 0.5 → 1
    expect(Money.fromCents(4500).percentage(Percentage.of(0)).isZero()).toBe(true);
  });

  it('compares values', () => {
    expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).equals(Money.fromCents(101))).toBe(false);
    expect(Money.fromCents(101).isGreaterThan(Money.fromCents(100))).toBe(true);
    expect(Money.fromCents(100).isGreaterThan(Money.fromCents(100))).toBe(false);
  });
});

describe('Percentage', () => {
  it('accepts whole numbers from 0 to 100', () => {
    expect(Percentage.of(0).value).toBe(0);
    expect(Percentage.of(100).value).toBe(100);
    expect(Percentage.of(40).equals(Percentage.of(40))).toBe(true);
  });

  it.each([-1, 101, 10.5])('rejects %s', (value) => {
    expect(() => Percentage.of(value)).toThrow(InvalidValueError);
  });
});
