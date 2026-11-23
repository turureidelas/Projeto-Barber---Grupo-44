import { describe, expect, it } from 'vitest';
import {
  formatLongDate,
  formatMoney,
  formatShortDate,
  formatTime,
  addDaysToLocalDate,
  isLocalDateString,
  initials,
  startOfWeek,
  formatWeekdayShort,
  formatDateTime,
  localDateTimeToIso,
  isoToLocalDate,
  toLocalDateString,
} from './format';

describe('format helpers (pt-BR, São Paulo)', () => {
  it('formats money from cents', () => {
    expect(formatMoney(4500).replace(/\s/g, ' ')).toBe('R$ 45,00');
    expect(formatMoney(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });

  it('shows times in São Paulo regardless of the machine time zone', () => {
    expect(formatTime('2026-11-18T12:30:00.000Z')).toBe('09:30');
  });

  it('formats local dates', () => {
    expect(formatLongDate('2026-11-18')).toBe('quarta-feira, 18 de novembro');
    expect(formatShortDate('2026-11-08')).toBe('08/11');
  });

  it('finds the São Paulo calendar day of an instant', () => {
    expect(toLocalDateString(new Date('2026-11-19T02:30:00Z'))).toBe('2026-11-18');
  });

  it('moves across days, months and years', () => {
    expect(addDaysToLocalDate('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToLocalDate('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('validates local date strings', () => {
    expect(isLocalDateString('2026-11-18')).toBe(true);
    expect(isLocalDateString('2026-02-30')).toBe(false);
    expect(isLocalDateString('18/11/2026')).toBe(false);
  });

  it('finds the Monday of a week', () => {
    expect(startOfWeek('2026-11-18')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
  });

  it('formats weekdays and date-times in pt-BR', () => {
    expect(formatWeekdayShort('2026-11-18')).toBe('qua');
    expect(formatDateTime('2026-11-18T13:00:00.000Z')).toBe('qua, 18/11 às 10:00');
  });

  it('converts São Paulo wall-clock times to instants and back', () => {
    const iso = localDateTimeToIso('2026-11-18', '09:30');
    expect(new Date(iso).toISOString()).toBe('2026-11-18T12:30:00.000Z');
    expect(isoToLocalDate('2026-11-19T02:30:00.000Z')).toBe('2026-11-18');
  });

  it('builds initials', () => {
    expect(initials('Ricardo Almeida')).toBe('RA');
    expect(initials('  camila  ')).toBe('C');
    expect(initials('Pedro Henrique Lopes')).toBe('PL');
    expect(initials('')).toBe('');
  });
});
