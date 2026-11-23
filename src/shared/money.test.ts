import { describe, expect, it } from 'vitest';
import { formatMoneyInput, parseMoneyInput } from './money';

describe('parseMoneyInput', () => {
  it.each([
    ['45', 4500],
    ['45,5', 4550],
    ['45,50', 4550],
    ['45.50', 4550],
    [' R$ 45,00 ', 4500],
    ['R$ 1.234,56', 123456],
    ['0', 0],
  ])('reads "%s" as %i cents', (text, cents) => {
    expect(parseMoneyInput(text)).toBe(cents);
  });

  it.each(['', 'abc', '45,555', '-10', '1,2,3', '1000000,00'])('rejects "%s"', (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });
});

describe('formatMoneyInput', () => {
  it('formats cents for an input field', () => {
    expect(formatMoneyInput(4500)).toBe('45,00');
    expect(formatMoneyInput(5)).toBe('0,05');
  });
});
