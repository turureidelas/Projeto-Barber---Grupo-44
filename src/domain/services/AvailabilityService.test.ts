import { describe, expect, it } from 'vitest';
import { Service } from '../entities/Service';
import { InvalidValueError } from '../errors/DomainError';
import {
  OutsideWorkingHoursError,
  ScheduleConflictError,
  SlotInPastError,
  TimeBlockedError,
} from '../errors/scheduling-errors';
import {
  aPolicy,
  aSingleService,
  aTimeBlock,
  aWeekSchedule,
  anAppointment,
  at,
  ids,
  minutes,
  reais,
} from '../testing/builders';
import { LocalDate } from '../value-objects/LocalDate';
import { TimeRange } from '../value-objects/TimeRange';
import { TimeWindow } from '../value-objects/TimeWindow';
import { WorkSchedule } from '../value-objects/WorkSchedule';
import {
  AvailabilityService,
  type AvailabilityOptions,
  type ProfessionalAgenda,
} from './AvailabilityService';

/**
 * Reference: Wednesday 2026-11-18, Ricardo works 09:00–19:00 with lunch 12:00–13:00
 * (Sat 09:00–14:00, Sun off). "Now" is 08:00 unless stated otherwise.
 */
const service = new AvailabilityService();
const NOW: AvailabilityOptions = { now: at('08:00') };

function agenda(overrides: Partial<ProfessionalAgenda> = {}): ProfessionalAgenda {
  return {
    professionalId: ids.ricardo,
    schedule: aWeekSchedule(),
    appointments: [],
    timeBlocks: [],
    ...overrides,
  };
}

const slot = (start: string, durationMinutes = 30, date?: string) =>
  TimeRange.startingAt(at(start, date), minutes(durationMinutes));

const startsOf = (slots: readonly TimeRange[]) =>
  slots.map((s) =>
    s.start.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
  );

describe('AvailabilityService.checkSlot', () => {
  it('accepts a free slot inside working hours', () => {
    expect(service.checkSlot(agenda(), slot('10:00'), NOW)).toEqual({ available: true });
  });

  describe('time already passed', () => {
    it('rejects a slot that started before now', () => {
      const result = service.checkSlot(agenda(), slot('10:00'), { now: at('10:01') });
      expect(result).toEqual({ available: false, reason: 'SLOT_IN_PAST' });
    });

    it('accepts a slot starting exactly now', () => {
      expect(service.checkSlot(agenda(), slot('10:00'), { now: at('10:00') }).available).toBe(true);
    });
  });

  describe('working hours ("escala")', () => {
    it.each([
      ['before opening', '08:30', 30],
      ['ending after closing', '18:45', 30],
      ['starting in lunch', '12:00', 30],
      ['running into lunch', '11:45', 30],
      ['spanning lunch', '11:30', 120],
    ])('rejects a slot %s', (_label, start, duration) => {
      const result = service.checkSlot(agenda(), slot(start, duration), NOW);
      expect(result).toMatchObject({ available: false, reason: 'OUTSIDE_WORKING_HOURS' });
    });

    it.each([
      ['at opening', '09:00'],
      ['ending exactly at lunch', '11:30'],
      ['right after lunch', '13:00'],
      ['ending exactly at closing', '18:30'],
    ])('accepts a slot %s', (_label, start) => {
      expect(service.checkSlot(agenda(), slot(start), NOW).available).toBe(true);
    });

    it('rejects any slot on a day off (Sunday)', () => {
      const result = service.checkSlot(agenda(), slot('10:00', 30, '2026-11-22'), NOW);
      expect(result).toMatchObject({ reason: 'OUTSIDE_WORKING_HOURS' });
    });

    it('uses the shorter Saturday hours', () => {
      expect(service.checkSlot(agenda(), slot('13:30', 30, '2026-11-21'), NOW).available).toBe(
        true,
      );
      expect(service.checkSlot(agenda(), slot('13:45', 30, '2026-11-21'), NOW).available).toBe(
        false,
      );
    });

    it('rejects everything when there is no schedule', () => {
      const result = service.checkSlot(
        agenda({ schedule: WorkSchedule.empty() }),
        slot('10:00'),
        NOW,
      );
      expect(result).toMatchObject({ reason: 'OUTSIDE_WORKING_HOURS' });
    });
  });

  describe('time blocks ("bloquear horário")', () => {
    const block = aTimeBlock(at('15:00'), at('16:00'));

    it('rejects a slot overlapping a block, pointing to it', () => {
      const result = service.checkSlot(agenda({ timeBlocks: [block] }), slot('15:30'), NOW);
      expect(result).toEqual({ available: false, reason: 'TIME_BLOCKED', conflictingId: block.id });
    });

    it('accepts slots touching the block edges', () => {
      const withBlock = agenda({ timeBlocks: [block] });
      expect(service.checkSlot(withBlock, slot('14:30'), NOW).available).toBe(true);
      expect(service.checkSlot(withBlock, slot('16:00'), NOW).available).toBe(true);
    });

    it("ignores another professional's block", () => {
      const othersBlock = aTimeBlock(at('15:00'), at('16:00'), ids.bruno);
      expect(
        service.checkSlot(agenda({ timeBlocks: [othersBlock] }), slot('15:30'), NOW).available,
      ).toBe(true);
    });
  });

  describe('overlapping appointments (never double-book)', () => {
    const booked = anAppointment({ start: at('10:00'), duration: minutes(30) });
    const withBooking = agenda({ appointments: [booked] });

    it.each([
      ['same start', '10:00', 30],
      ['starting inside', '10:15', 30],
      ['ending inside', '09:45', 30],
      ['enclosing it', '09:30', 90],
      ['inside it', '10:10', 10],
    ])('rejects a slot with the %s', (_label, start, duration) => {
      const result = service.checkSlot(withBooking, slot(start, duration), NOW);
      expect(result).toEqual({
        available: false,
        reason: 'SCHEDULE_CONFLICT',
        conflictingId: booked.id,
      });
    });

    it('accepts back-to-back slots', () => {
      expect(service.checkSlot(withBooking, slot('09:30'), NOW).available).toBe(true);
      expect(service.checkSlot(withBooking, slot('10:30'), NOW).available).toBe(true);
    });

    it.each([
      ['confirmed', booked.confirm()],
      ['in service', booked.markArrived()],
    ])('is blocked by a %s appointment', (_label, appointment) => {
      expect(
        service.checkSlot(agenda({ appointments: [appointment] }), slot('10:00'), NOW).available,
      ).toBe(false);
    });

    it.each([
      [
        'cancelled',
        booked.cancel({ by: 'CLIENT', reason: null, now: at('07:00'), policy: aPolicy() }),
      ],
      ['no-show', booked.markNoShow(at('10:20'), aPolicy())],
      [
        'completed',
        booked.complete({ amountPaid: reais(45), paymentMethod: 'PIX', now: at('10:30') }),
      ],
    ])('frees the time of a %s appointment immediately', (_label, appointment) => {
      expect(
        service.checkSlot(agenda({ appointments: [appointment] }), slot('10:00'), NOW).available,
      ).toBe(true);
    });

    it("ignores another professional's appointments", () => {
      const brunos = anAppointment({ professionalId: ids.bruno, start: at('10:00') });
      expect(
        service.checkSlot(agenda({ appointments: [brunos] }), slot('10:00'), NOW).available,
      ).toBe(true);
    });

    it('ignores the appointment being rescheduled', () => {
      const options = { ...NOW, ignoreAppointmentId: booked.id };
      expect(service.checkSlot(withBooking, slot('10:15'), options).available).toBe(true);
    });
  });

  describe('combos use their own (longer) duration', () => {
    const combo = Service.createCombo({
      id: ids.combo,
      barbershopId: ids.shop,
      name: 'Corte + Barba',
      duration: minutes(60),
      price: reais(70),
      items: [aSingleService(ids.haircut), aSingleService(ids.beard, 'Barba')],
    });
    const comboSlot = (start: string) => TimeRange.startingAt(at(start), combo.duration);

    it('fits a 60-minute combo right before lunch', () => {
      expect(service.checkSlot(agenda(), comboSlot('11:00'), NOW).available).toBe(true);
    });

    it('rejects the combo when it would run into lunch', () => {
      expect(service.checkSlot(agenda(), comboSlot('11:15'), NOW)).toMatchObject({
        reason: 'OUTSIDE_WORKING_HOURS',
      });
    });

    it('rejects the combo when its tail hits the next appointment', () => {
      const next = anAppointment({ start: at('10:00') });
      expect(
        service.checkSlot(agenda({ appointments: [next] }), comboSlot('09:30'), NOW),
      ).toMatchObject({
        reason: 'SCHEDULE_CONFLICT',
      });
    });
  });

  it('checks rules in order: past, working hours, blocks, appointments', () => {
    const everything = agenda({
      appointments: [anAppointment({ start: at('15:00') })],
      timeBlocks: [aTimeBlock(at('15:00'), at('16:00'))],
    });
    expect(service.checkSlot(everything, slot('15:00'), NOW)).toMatchObject({
      reason: 'TIME_BLOCKED',
    });
    expect(service.checkSlot(everything, slot('15:00'), { now: at('16:00') })).toMatchObject({
      reason: 'SLOT_IN_PAST',
    });
  });
});

describe('AvailabilityService.assertSlotAvailable', () => {
  const booked = anAppointment({ start: at('10:00') });
  const block = aTimeBlock(at('15:00'), at('16:00'));
  const busy = agenda({ appointments: [booked], timeBlocks: [block] });

  it('does nothing when the slot is free', () => {
    expect(() => {
      service.assertSlotAvailable(busy, slot('11:00'), NOW);
    }).not.toThrow();
  });

  it.each([
    ['SlotInPastError', slot('07:00'), SlotInPastError],
    ['OutsideWorkingHoursError', slot('12:00'), OutsideWorkingHoursError],
    ['TimeBlockedError', slot('15:00'), TimeBlockedError],
    ['ScheduleConflictError', slot('10:00'), ScheduleConflictError],
  ])('throws %s', (_label, range, ErrorType) => {
    expect(() => {
      service.assertSlotAvailable(busy, range, NOW);
    }).toThrow(ErrorType);
  });

  it('tells which appointment or block is in the way', () => {
    expect(() => {
      service.assertSlotAvailable(busy, slot('10:00'), NOW);
    }).toThrow(expect.objectContaining({ conflictingAppointmentId: booked.id }));
    expect(() => {
      service.assertSlotAvailable(busy, slot('15:00'), NOW);
    }).toThrow(expect.objectContaining({ timeBlockId: block.id }));
  });
});

describe('AvailabilityService.listAvailableSlots', () => {
  const wednesday = LocalDate.parse('2026-11-18');

  it('lists every 15-minute start that fits, skipping lunch', () => {
    const slots = service.listAvailableSlots(agenda(), wednesday, minutes(30), NOW);
    // 09:00–11:30 (11 starts) + 13:00–18:30 (23 starts)
    expect(slots).toHaveLength(34);
    expect(startsOf(slots).slice(0, 3)).toEqual(['09:00', '09:15', '09:30']);
    expect(startsOf(slots)).not.toContain('11:45');
    expect(startsOf(slots)).not.toContain('12:00');
    expect(startsOf(slots).at(-1)).toBe('18:30');
    expect(slots.every((s) => s.durationMinutes === 30)).toBe(true);
  });

  it('removes slots taken by appointments and blocks', () => {
    const slots = service.listAvailableSlots(
      agenda({
        appointments: [anAppointment({ start: at('10:00') })],
        timeBlocks: [aTimeBlock(at('15:00'), at('16:00'))],
      }),
      wednesday,
      minutes(30),
      NOW,
    );
    const starts = startsOf(slots);
    expect(starts).not.toContain('09:45');
    expect(starts).not.toContain('10:00');
    expect(starts).not.toContain('10:15');
    expect(starts).toContain('10:30');
    expect(starts).not.toContain('14:45');
    expect(starts).not.toContain('15:45');
    expect(starts).toContain('16:00');
  });

  it('skips times that already passed', () => {
    const slots = service.listAvailableSlots(agenda(), wednesday, minutes(30), {
      now: at('10:20'),
    });
    expect(startsOf(slots)[0]).toBe('10:30');
  });

  it('fits longer services (combos) only where they fit entirely', () => {
    const starts = startsOf(service.listAvailableSlots(agenda(), wednesday, minutes(60), NOW));
    expect(starts).toContain('11:00');
    expect(starts).not.toContain('11:15');
    expect(starts.at(-1)).toBe('18:00');
  });

  it('returns nothing on a day off', () => {
    expect(
      service.listAvailableSlots(agenda(), LocalDate.parse('2026-11-22'), minutes(30), NOW),
    ).toEqual([]);
  });

  it('aligns to the grid when the shift starts at an odd time', () => {
    const odd = WorkSchedule.create({
      3: { hours: TimeWindow.parse('09:10', '10:00'), breaks: [] },
    });
    const starts = startsOf(
      service.listAvailableSlots(agenda({ schedule: odd }), wednesday, minutes(30), NOW),
    );
    expect(starts).toEqual(['09:15', '09:30']);
  });

  it('supports a configurable grid and a shift ending at midnight', () => {
    const late = WorkSchedule.create({
      3: { hours: TimeWindow.parse('22:00', '24:00'), breaks: [] },
    });
    const halfHour = new AvailabilityService({ slotStepMinutes: 30 });
    const starts = startsOf(
      halfHour.listAvailableSlots(agenda({ schedule: late }), wednesday, minutes(30), NOW),
    );
    expect(starts).toEqual(['22:00', '22:30', '23:00', '23:30']);
  });
});

describe('AvailabilityService.assertCanBlock', () => {
  const booked = anAppointment({ start: at('10:00') });
  const range = (start: string, end: string) => TimeRange.create(at(start), at(end));

  it('allows blocking free time, even over another block or outside working hours', () => {
    const busy = agenda({
      appointments: [booked],
      timeBlocks: [aTimeBlock(at('15:00'), at('16:00'))],
    });
    expect(() => {
      service.assertCanBlock(busy, range('15:30', '17:00'), NOW);
      service.assertCanBlock(busy, range('19:00', '20:00'), NOW);
      service.assertCanBlock(busy, range('10:30', '11:00'), NOW);
    }).not.toThrow();
  });

  it('refuses to cover an active appointment', () => {
    expect(() => {
      service.assertCanBlock(agenda({ appointments: [booked] }), range('09:00', '12:00'), NOW);
    }).toThrow(ScheduleConflictError);
  });

  it('ignores cancelled appointments and other professionals', () => {
    const cancelled = booked.cancel({
      by: 'STAFF',
      reason: null,
      now: at('07:00'),
      policy: aPolicy(),
    });
    const brunos = anAppointment({ professionalId: ids.bruno, start: at('10:00') });
    expect(() => {
      service.assertCanBlock(
        agenda({ appointments: [cancelled, brunos] }),
        range('09:00', '12:00'),
        NOW,
      );
    }).not.toThrow();
  });

  it('refuses to start in the past', () => {
    expect(() => {
      service.assertCanBlock(agenda(), range('10:00', '11:00'), { now: at('10:30') });
    }).toThrow(SlotInPastError);
  });
});

describe('AvailabilityService configuration', () => {
  it.each([0, 4, 61, 7.5])('rejects a slot step of %s minutes', (slotStepMinutes) => {
    expect(() => new AvailabilityService({ slotStepMinutes })).toThrow(InvalidValueError);
  });

  it('exposes working windows as real instants (São Paulo)', () => {
    const ranges = service.workingRangesOn(aWeekSchedule(), LocalDate.parse('2026-11-18'));
    expect(ranges.map((r) => [r.start.toISOString(), r.end.toISOString()])).toEqual([
      ['2026-11-18T12:00:00.000Z', '2026-11-18T15:00:00.000Z'],
      ['2026-11-18T16:00:00.000Z', '2026-11-18T22:00:00.000Z'],
    ]);
  });
});
