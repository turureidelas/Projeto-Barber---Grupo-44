import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { Duration } from './Duration';
import { LocalDate } from './LocalDate';
import { TimeOfDay } from './TimeOfDay';
import { TimeRange } from './TimeRange';
import { TimeWindow } from './TimeWindow';

const window = (start: string, end: string) => TimeWindow.parse(start, end);
const asText = (windows: readonly TimeWindow[]) => windows.map((w) => w.toString());

describe('Duration', () => {
  it('stores whole minutes and converts to milliseconds', () => {
    const duration = Duration.ofMinutes(45);
    expect(duration.minutes).toBe(45);
    expect(duration.milliseconds).toBe(45 * 60_000);
  });

  it('adds durations and compares them', () => {
    expect(Duration.ofMinutes(30).plus(Duration.ofMinutes(20)).minutes).toBe(50);
    expect(Duration.ofMinutes(30).equals(Duration.ofMinutes(30))).toBe(true);
  });

  it.each([0, -5, 12.5, Duration.MAX_MINUTES + 1])('rejects %s minutes', (minutes) => {
    expect(() => Duration.ofMinutes(minutes)).toThrow(InvalidValueError);
  });
});

describe('TimeOfDay', () => {
  it('parses HH:mm', () => {
    const time = TimeOfDay.parse('09:30');
    expect(time.minutesSinceMidnight).toBe(570);
    expect(time.hours).toBe(9);
    expect(time.minutes).toBe(30);
    expect(time.toString()).toBe('09:30');
  });

  it('accepts 24:00 as end of day', () => {
    expect(TimeOfDay.parse('24:00').minutesSinceMidnight).toBe(TimeOfDay.MINUTES_IN_DAY);
  });

  it.each(['9:30', '10:60', '24:30', 'ab:cd', ''])('rejects "%s"', (value) => {
    expect(() => TimeOfDay.parse(value)).toThrow(InvalidValueError);
  });

  it('rejects minutes outside the day', () => {
    expect(() => TimeOfDay.fromMinutes(-1)).toThrow(InvalidValueError);
    expect(() => TimeOfDay.fromMinutes(1441)).toThrow(InvalidValueError);
  });

  it('compares times', () => {
    expect(TimeOfDay.parse('09:00').isBefore(TimeOfDay.parse('09:15'))).toBe(true);
    expect(TimeOfDay.parse('09:15').isBefore(TimeOfDay.parse('09:15'))).toBe(false);
    expect(TimeOfDay.fromMinutes(555).equals(TimeOfDay.parse('09:15'))).toBe(true);
  });
});

describe('TimeWindow', () => {
  it('requires start before end', () => {
    expect(() => window('10:00', '10:00')).toThrow(InvalidValueError);
    expect(() => window('11:00', '10:00')).toThrow(InvalidValueError);
  });

  it('knows its duration', () => {
    expect(window('09:00', '12:30').durationMinutes).toBe(210);
  });

  it('treats touching windows as not overlapping', () => {
    expect(window('09:00', '12:00').overlaps(window('12:00', '13:00'))).toBe(false);
    expect(window('09:00', '12:01').overlaps(window('12:00', '13:00'))).toBe(true);
  });

  it('checks containment', () => {
    expect(window('09:00', '19:00').contains(window('12:00', '13:00'))).toBe(true);
    expect(window('09:00', '19:00').contains(window('09:00', '19:00'))).toBe(true);
    expect(window('09:00', '19:00').contains(window('18:30', '19:30'))).toBe(false);
    expect(window('09:00', '19:00').contains(window('08:30', '09:30'))).toBe(false);
  });

  describe('subtract', () => {
    const day = window('09:00', '19:00');

    it('returns the whole window when nothing is removed', () => {
      expect(asText(day.subtract([]))).toEqual(['09:00–19:00']);
    });

    it('splits around a break', () => {
      expect(asText(day.subtract([window('12:00', '13:00')]))).toEqual([
        '09:00–12:00',
        '13:00–19:00',
      ]);
    });

    it('handles unsorted and overlapping removals', () => {
      const removed = [
        window('15:00', '16:00'),
        window('12:00', '13:00'),
        window('12:30', '13:30'),
      ];
      expect(asText(day.subtract(removed))).toEqual(['09:00–12:00', '13:30–15:00', '16:00–19:00']);
    });

    it('handles removals touching the edges or outside the window', () => {
      const removed = [
        window('08:00', '09:30'),
        window('18:00', '20:00'),
        window('06:00', '07:00'),
      ];
      expect(asText(day.subtract(removed))).toEqual(['09:30–18:00']);
    });

    it('ignores a removal nested inside an earlier one', () => {
      const removed = [window('10:00', '14:00'), window('11:00', '12:00')];
      expect(asText(day.subtract(removed))).toEqual(['09:00–10:00', '14:00–19:00']);
    });

    it('returns nothing when fully covered', () => {
      expect(day.subtract([window('08:00', '20:00')])).toEqual([]);
    });
  });

  it('compares windows', () => {
    expect(window('09:00', '10:00').equals(window('09:00', '10:00'))).toBe(true);
    expect(window('09:00', '10:00').equals(window('09:00', '10:30'))).toBe(false);
  });
});

describe('LocalDate', () => {
  it('parses and prints yyyy-MM-dd', () => {
    const date = LocalDate.parse('2026-11-18');
    expect([date.year, date.month, date.day]).toEqual([2026, 11, 18]);
    expect(date.toString()).toBe('2026-11-18');
    expect(LocalDate.of(2026, 1, 5).toString()).toBe('2026-01-05');
  });

  it.each(['2026-02-30', '2026-13-01', '18/11/2026', '1800-01-01', '2026-11-1'])(
    'rejects "%s"',
    (value) => {
      expect(() => LocalDate.parse(value)).toThrow(InvalidValueError);
    },
  );

  it('knows the weekday (0 = Sunday)', () => {
    expect(LocalDate.parse('2026-11-18').weekday).toBe(3);
    expect(LocalDate.parse('2026-11-22').weekday).toBe(0);
    expect(LocalDate.parse('2026-11-21').weekday).toBe(6);
  });

  it('converts an instant to the São Paulo calendar date', () => {
    // 02:30 UTC on the 19th is still 23:30 on the 18th in São Paulo.
    expect(LocalDate.fromInstant(new Date('2026-11-19T02:30:00Z')).toString()).toBe('2026-11-18');
    expect(LocalDate.fromInstant(new Date('2026-11-19T03:00:00Z')).toString()).toBe('2026-11-19');
  });

  it('builds the instant of a wall-clock time in São Paulo', () => {
    const date = LocalDate.parse('2026-11-18');
    expect(date.at(TimeOfDay.parse('09:30')).toISOString()).toBe('2026-11-18T12:30:00.000Z');
    expect(date.at(TimeOfDay.parse('24:00')).toISOString()).toBe('2026-11-19T03:00:00.000Z');
  });

  it('adds days across month and year boundaries', () => {
    expect(LocalDate.parse('2026-11-30').addDays(1).toString()).toBe('2026-12-01');
    expect(LocalDate.parse('2026-12-31').addDays(1).toString()).toBe('2027-01-01');
    expect(LocalDate.parse('2026-03-01').addDays(-1).toString()).toBe('2026-02-28');
  });

  it('compares dates', () => {
    const a = LocalDate.parse('2026-11-18');
    const b = LocalDate.parse('2026-11-19');
    expect(a.isBefore(b)).toBe(true);
    expect(b.isBefore(a)).toBe(false);
    expect(a.equals(LocalDate.of(2026, 11, 18))).toBe(true);
    expect(a.compare(b)).toBeLessThan(0);
  });
});

describe('TimeRange', () => {
  const t = (iso: string) => new Date(`2026-11-18T${iso}:00-03:00`);
  const range = (start: string, end: string) => TimeRange.create(t(start), t(end));

  it('requires a valid start before the end', () => {
    expect(() => range('10:00', '10:00')).toThrow(InvalidValueError);
    expect(() => range('10:30', '10:00')).toThrow(InvalidValueError);
    expect(() => TimeRange.create(new Date('invalid'), t('10:00'))).toThrow(InvalidValueError);
  });

  it('builds from a start and a duration', () => {
    const r = TimeRange.startingAt(t('10:00'), Duration.ofMinutes(45));
    expect(r.end.toISOString()).toBe(t('10:45').toISOString());
    expect(r.durationMinutes).toBe(45);
  });

  it('is half-open: touching ranges do not overlap', () => {
    expect(range('09:00', '10:00').overlaps(range('10:00', '10:30'))).toBe(false);
    expect(range('10:00', '10:30').overlaps(range('09:00', '10:00'))).toBe(false);
    expect(range('09:00', '10:01').overlaps(range('10:00', '10:30'))).toBe(true);
    expect(range('09:00', '12:00').overlaps(range('10:00', '10:30'))).toBe(true);
  });

  it('checks containment and start', () => {
    expect(range('09:00', '12:00').contains(range('09:00', '12:00'))).toBe(true);
    expect(range('09:00', '12:00').contains(range('11:30', '12:30'))).toBe(false);
    expect(range('09:00', '10:00').startsBefore(t('09:01'))).toBe(true);
    expect(range('09:00', '10:00').startsBefore(t('09:00'))).toBe(false);
  });

  it('is immutable (getters return copies)', () => {
    const r = range('09:00', '10:00');
    r.start.setFullYear(2000);
    expect(r.start.toISOString()).toBe(t('09:00').toISOString());
  });

  it('compares ranges', () => {
    expect(range('09:00', '10:00').equals(range('09:00', '10:00'))).toBe(true);
    expect(range('09:00', '10:00').equals(range('09:00', '10:30'))).toBe(false);
  });
});
