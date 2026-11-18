import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { at } from '../testing/builders';
import { CancellationPolicy } from './CancellationPolicy';
import { TimeWindow } from './TimeWindow';
import { WorkSchedule } from './WorkSchedule';

describe('CancellationPolicy', () => {
  it('defaults to 2 hours notice and 15 minutes of no-show tolerance', () => {
    const policy = CancellationPolicy.default();
    expect(policy.minNoticeHours).toBe(2);
    expect(policy.noShowToleranceMinutes).toBe(15);
  });

  it.each([
    { minNoticeHours: -1, noShowToleranceMinutes: 15 },
    { minNoticeHours: 169, noShowToleranceMinutes: 15 },
    { minNoticeHours: 1.5, noShowToleranceMinutes: 15 },
    { minNoticeHours: 2, noShowToleranceMinutes: -1 },
    { minNoticeHours: 2, noShowToleranceMinutes: 121 },
  ])('rejects %o', (props) => {
    expect(() => CancellationPolicy.create(props)).toThrow(InvalidValueError);
  });

  describe('change deadline (2h notice, appointment at 10:00)', () => {
    const policy = CancellationPolicy.create({ minNoticeHours: 2, noShowToleranceMinutes: 15 });
    const start = at('10:00');

    it('is 2 hours before the start', () => {
      expect(policy.changeDeadline(start)).toEqual(at('08:00'));
    });

    it('is still on time exactly at the deadline', () => {
      expect(policy.isLateChange(start, at('07:59'))).toBe(false);
      expect(policy.isLateChange(start, at('08:00'))).toBe(false);
    });

    it('is late after the deadline', () => {
      expect(policy.isLateChange(start, new Date(at('08:00').getTime() + 1))).toBe(true);
      expect(policy.isLateChange(start, at('09:30'))).toBe(true);
    });

    it('with zero notice, only after the start is late', () => {
      const anytime = CancellationPolicy.create({ minNoticeHours: 0, noShowToleranceMinutes: 0 });
      expect(anytime.isLateChange(start, at('10:00'))).toBe(false);
      expect(anytime.isLateChange(start, at('10:01'))).toBe(true);
    });
  });

  describe('no-show tolerance (15 min, appointment at 10:00)', () => {
    const policy = CancellationPolicy.default();
    const start = at('10:00');

    it('allows "cliente faltou" from 10:15', () => {
      expect(policy.noShowAllowedFrom(start)).toEqual(at('10:15'));
      expect(policy.canMarkNoShow(start, at('10:14'))).toBe(false);
      expect(policy.canMarkNoShow(start, at('10:15'))).toBe(true);
    });
  });
});

describe('WorkSchedule', () => {
  const hours = TimeWindow.parse('09:00', '19:00');
  const lunch = TimeWindow.parse('12:00', '13:00');
  const coffee = TimeWindow.parse('16:00', '16:15');

  it('keeps only the configured weekdays', () => {
    const schedule = WorkSchedule.create({ 3: { hours, breaks: [] }, 1: { hours, breaks: [] } });
    expect(schedule.workingDays()).toEqual([1, 3]);
    expect(schedule.dayOf(0)).toBeNull();
    expect(schedule.dayOf(3)?.hours.equals(hours)).toBe(true);
  });

  it('subtracts breaks from working hours', () => {
    const schedule = WorkSchedule.create({ 3: { hours, breaks: [coffee, lunch] } });
    expect(schedule.workingWindowsOn(3).map(String)).toEqual([
      '09:00–12:00',
      '13:00–16:00',
      '16:15–19:00',
    ]);
    expect(schedule.workingWindowsOn(0)).toEqual([]);
  });

  it('stores breaks sorted', () => {
    const schedule = WorkSchedule.create({ 3: { hours, breaks: [coffee, lunch] } });
    expect(schedule.dayOf(3)?.breaks.map(String)).toEqual(['12:00–13:00', '16:00–16:15']);
  });

  it('rejects breaks outside working hours', () => {
    const late = TimeWindow.parse('18:30', '19:30');
    expect(() => WorkSchedule.create({ 3: { hours, breaks: [late] } })).toThrow(InvalidValueError);
  });

  it('rejects overlapping breaks', () => {
    const overlapping = TimeWindow.parse('12:30', '13:30');
    expect(() => WorkSchedule.create({ 3: { hours, breaks: [lunch, overlapping] } })).toThrow(
      InvalidValueError,
    );
  });

  it('round-trips through its input', () => {
    const schedule = WorkSchedule.create({ 2: { hours, breaks: [lunch] } });
    const copy = WorkSchedule.create(schedule.toInput());
    expect(copy.workingDays()).toEqual([2]);
    expect(copy.workingWindowsOn(2).map(String)).toEqual(schedule.workingWindowsOn(2).map(String));
  });

  it('can be empty', () => {
    expect(WorkSchedule.empty().workingDays()).toEqual([]);
  });
});
