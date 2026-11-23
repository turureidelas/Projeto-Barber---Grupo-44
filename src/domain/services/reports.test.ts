import { describe, expect, it } from 'vitest';
import type { Appointment, PaymentMethod } from '../entities/Appointment';
import { toId, type ClientId } from '../entities/ids';
import { Professional } from '../entities/Professional';
import {
  aPolicy,
  aTimeBlock,
  aWeekSchedule,
  anAppointment,
  at,
  ids,
  minutes,
  reais,
} from '../testing/builders';
import { LocalDate } from '../value-objects/LocalDate';
import { Percentage } from '../value-objects/Percentage';
import { AvailabilityService } from './AvailabilityService';
import {
  buildPeriodReport,
  clientReturn,
  MAX_REPORT_DAYS,
  noShowRate,
  occupancyOf,
  paymentBreakdown,
  periodDates,
  rankServices,
  revenueOf,
} from './reports';

/** Reference week: Mon 16/11 – Sun 22/11/2026. Weekdays 09–19 with lunch 12–13 = 540 min. */
const availability = new AvailabilityService();
const date = (value: string) => LocalDate.parse(value);
const WEDNESDAY = '2026-11-18';
const SUNDAY = '2026-11-22';

const joao = ids.client;
const maria = toId<ClientId>('client-maria');
const pedro = toId<ClientId>('client-pedro');
const ana = toId<ClientId>('client-ana');

function aProfessional(id = ids.ricardo, commission = 50): Professional {
  return Professional.create({
    id,
    barbershopId: ids.shop,
    name: id === ids.ricardo ? 'Ricardo Almeida' : 'Bruno Santos',
    specialty: null,
    photoUrl: null,
    commission: Percentage.of(commission),
    schedule: aWeekSchedule(),
    active: true,
  });
}

type Booking = Parameters<typeof anAppointment>[0];

const booked = (time: string, day = WEDNESDAY, overrides: Booking = {}) =>
  anAppointment({ start: at(time, day), ...overrides });

const completed = (
  time: string,
  paid: number,
  day = WEDNESDAY,
  overrides: Booking = {},
  paymentMethod: PaymentMethod = 'PIX',
) =>
  booked(time, day, overrides).complete({
    amountPaid: reais(paid),
    paymentMethod,
    now: at('23:00', day),
  });

const noShow = (time: string, day = WEDNESDAY, overrides: Booking = {}) =>
  booked(time, day, overrides).markNoShow(at('23:00', day), aPolicy());

const cancelled = (time: string, day = WEDNESDAY, overrides: Booking = {}) =>
  booked(time, day, overrides).cancel({
    by: 'STAFF',
    reason: 'Cliente pediu',
    now: at('08:00', day),
    policy: aPolicy(),
  });

describe('periodDates', () => {
  it('lists every day of the period, both ends included', () => {
    expect(periodDates(date('2026-11-16'), date('2026-11-18')).map(String)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(periodDates(date(WEDNESDAY), date(WEDNESDAY))).toHaveLength(1);
  });

  it('rejects a period that ends before it starts or is longer than a year', () => {
    expect(() => periodDates(date('2026-11-18'), date('2026-11-17'))).toThrow(/reportPeriod/);
    const start = date('2026-01-01');
    expect(periodDates(start, start.addDays(MAX_REPORT_DAYS - 1))).toHaveLength(MAX_REPORT_DAYS);
    expect(() => periodDates(start, start.addDays(MAX_REPORT_DAYS))).toThrow(/at most 366 days/);
  });
});

describe('revenue and no-shows', () => {
  it('counts only what was actually paid for completed appointments', () => {
    const appointments = [completed('09:00', 50), completed('10:00', 39.9), booked('11:00')];
    expect(revenueOf(appointments).cents).toBe(8990);
    expect(revenueOf([]).cents).toBe(0);
  });

  it('divides no-shows by everyone who was expected (completed + no-shows)', () => {
    const appointments = [
      completed('09:00', 45),
      completed('10:00', 45),
      completed('11:00', 45),
      noShow('13:00'),
      cancelled('14:00'),
      booked('15:00'),
    ];
    expect(noShowRate(appointments)).toBe(0.25);
    expect(noShowRate([cancelled('14:00'), booked('15:00')])).toBeNull();
  });
});

describe('occupancyOf', () => {
  const ricardo = aProfessional();

  it('divides booked minutes by working minutes minus blocks', () => {
    const blocks = [
      aTimeBlock(at('14:00'), at('15:00')),
      aTimeBlock(at('14:30'), at('16:00')), // overlaps the previous one: counted once
      aTimeBlock(at('14:45'), at('15:15')), // inside the others: adds nothing
      aTimeBlock(at('11:30'), at('13:30')), // spans lunch: only 30 + 30 min are working time
      aTimeBlock(at('20:00'), at('21:00')), // after hours
      aTimeBlock(at('09:00'), at('10:00'), ids.bruno), // someone else's
    ];
    const appointments = [
      completed('09:00', 45),
      noShow('10:00'), // the chair was reserved, so it counts
      cancelled('10:30'),
      booked('16:00', WEDNESDAY, { duration: minutes(60) }),
      booked('09:00', WEDNESDAY, { professionalId: ids.bruno }),
    ];

    expect(
      occupancyOf(
        { professional: ricardo, dates: [date(WEDNESDAY)], appointments, timeBlocks: blocks },
        availability,
      ),
    ).toEqual({ bookedMinutes: 120, availableMinutes: 360, rate: 1 / 3 });
  });

  it('adds up every day of the period and has no rate without working time', () => {
    const week = periodDates(date('2026-11-16'), date(SUNDAY));
    const empty = { professional: ricardo, appointments: [], timeBlocks: [] };
    expect(occupancyOf({ ...empty, dates: week }, availability)).toEqual({
      bookedMinutes: 0,
      availableMinutes: 5 * 540 + 300,
      rate: 0,
    });
    expect(occupancyOf({ ...empty, dates: [date(SUNDAY)] }, availability).rate).toBeNull();
  });

  it('never goes above 100%', () => {
    const occupancy = occupancyOf(
      {
        professional: ricardo,
        dates: [date(WEDNESDAY)],
        appointments: [booked('18:00', WEDNESDAY, { duration: minutes(60) })],
        timeBlocks: [aTimeBlock(at('09:00'), at('18:30'))],
      },
      availability,
    );
    expect(occupancy).toEqual({ bookedMinutes: 60, availableMinutes: 30, rate: 1 });
  });
});

describe('rankServices', () => {
  const combo = { serviceId: ids.combo };
  const beard = { serviceId: ids.beard };

  it('ranks by bookings (cancelled ones left out), ties in a stable order', () => {
    const ranking = rankServices([
      completed('09:00', 45),
      booked('10:00'),
      cancelled('11:00'),
      cancelled('13:00', WEDNESDAY, beard),
      completed('14:00', 70, WEDNESDAY, combo),
      noShow('15:00', WEDNESDAY, combo),
      completed('16:00', 35, WEDNESDAY, beard),
    ]);
    expect(ranking.map((entry) => [entry.serviceId, entry.count, entry.revenue.cents])).toEqual([
      [ids.combo, 2, 7000],
      [ids.haircut, 2, 4500],
      [ids.beard, 1, 3500],
    ]);
  });

  it('is empty without bookings', () => {
    expect(rankServices([cancelled('09:00')])).toEqual([]);
  });
});

describe('paymentBreakdown', () => {
  it('groups completed appointments by payment method, leaving unused methods out', () => {
    const breakdown = paymentBreakdown([
      completed('09:00', 45, WEDNESDAY, {}, 'CREDIT_CARD'),
      completed('10:00', 50, WEDNESDAY, {}, 'PIX'),
      completed('11:00', 30, WEDNESDAY, {}, 'PIX'),
      booked('13:00'),
    ]);
    expect(breakdown.map((entry) => [entry.method, entry.count, entry.amount.cents])).toEqual([
      ['PIX', 2, 8000],
      ['CREDIT_CARD', 1, 4500],
    ]);
  });
});

describe('clientReturn', () => {
  const period = { start: at('00:00', '2026-11-16'), end: at('00:00', '2026-11-23') };
  const of = (clientId: ClientId) => ({ clientId });

  it('tells how many clients of the period had come before, and how often they return', () => {
    const history: Appointment[] = [
      // João: came on 21/10 and 04/11 → returning, every 14 days on average.
      completed('10:00', 45, '2026-10-21', of(joao)),
      completed('10:00', 45, '2026-11-04', of(joao)),
      completed('10:00', 45, WEDNESDAY, of(joao)),
      // Maria: first visit in the period → new client, no return frequency yet.
      completed('11:00', 45, WEDNESDAY, of(maria)),
      noShow('09:00', '2026-11-02', of(maria)),
      // Pedro: only came before → not part of the period.
      completed('10:00', 45, '2026-11-02', of(pedro)),
      // Ana: missed her appointment in the period and comes back after it → not served.
      noShow('15:00', WEDNESDAY, of(ana)),
      completed('15:00', 45, '2026-11-25', of(ana)),
    ];
    expect(clientReturn(history, period)).toEqual({
      served: 2,
      returning: 1,
      returningRate: 0.5,
      averageDaysBetweenVisits: 14,
    });
  });

  it('has no rates without visits', () => {
    expect(clientReturn([booked('10:00')], period)).toEqual({
      served: 0,
      returning: 0,
      returningRate: null,
      averageDaysBetweenVisits: null,
    });
  });
});

describe('buildPeriodReport', () => {
  const ricardo = aProfessional(ids.ricardo, 100);
  const bruno = aProfessional(ids.bruno, 40);
  const withBruno = { professionalId: ids.bruno };
  const input = {
    from: date(WEDNESDAY),
    to: date(WEDNESDAY),
    range: { start: at('00:00'), end: at('00:00', '2026-11-19') },
    timeBlocks: [aTimeBlock(at('13:00'), at('19:00'), ids.bruno)],
  };

  const appointments = [
    completed('10:00', 45, '2026-11-11', { clientId: maria }), // before: history only
    completed('09:00', 45, WEDNESDAY, { clientId: maria }),
    completed('10:00', 69.99, WEDNESDAY, { ...withBruno, serviceId: ids.combo }, 'CASH'),
    completed('11:00', 35, WEDNESDAY, { ...withBruno, serviceId: ids.beard }),
    noShow('09:00', WEDNESDAY, withBruno),
    cancelled('14:00'),
    booked('16:00'),
  ];

  it('reports totals and each professional', () => {
    const report = buildPeriodReport(
      { ...input, professionals: [ricardo, bruno], appointments },
      availability,
    );

    expect(report).toMatchObject({
      appointments: 6,
      completed: 3,
      noShows: 1,
      cancellations: 1,
      noShowRate: 0.25,
      // 45 + 69.99 + 35 = 149.99 ÷ 3 = 49.996 → 50.00
      averageTicket: reais(50),
      // Ricardo 60 of 540 min; Bruno 90 of 180 (blocked all afternoon)
      occupancy: { bookedMinutes: 150, availableMinutes: 720, rate: 150 / 720 },
      clients: { served: 2, returning: 1 },
    });
    expect(report.revenue.cents).toBe(14999);
    // Ricardo keeps 100% of 45,00; Bruno 40% of 104,99 = 41,996 → 42,00
    expect(report.commission.cents).toBe(4500 + 4200);

    expect(report.professionals).toEqual([
      {
        professional: ricardo,
        revenue: reais(45),
        commission: reais(45),
        completed: 1,
        noShows: 0,
        cancellations: 1,
        noShowRate: 0,
        occupancy: { bookedMinutes: 60, availableMinutes: 540, rate: 60 / 540 },
      },
      {
        professional: bruno,
        revenue: reais(104.99),
        commission: reais(42),
        completed: 2,
        noShows: 1,
        cancellations: 0,
        noShowRate: 1 / 3,
        occupancy: { bookedMinutes: 90, availableMinutes: 180, rate: 0.5 },
      },
    ]);
    expect(report.services.map((entry) => entry.serviceId)).toEqual([
      ids.haircut,
      ids.beard,
      ids.combo,
    ]);
    expect(report.payments.map((entry) => entry.method)).toEqual(['CASH', 'PIX']);
  });

  it("reports a single professional's own numbers", () => {
    const report = buildPeriodReport(
      { ...input, professionals: [bruno], appointments },
      availability,
    );
    expect(report.professionals.map((entry) => entry.professional)).toEqual([bruno]);
    expect(report).toMatchObject({ appointments: 3, completed: 2, noShows: 1 });
    expect(report.clients).toMatchObject({ served: 1, returning: 0 });
  });

  it('has no average ticket nor rates in a period without appointments', () => {
    const report = buildPeriodReport(
      { ...input, professionals: [ricardo], appointments: [] },
      availability,
    );
    expect(report).toMatchObject({
      appointments: 0,
      averageTicket: null,
      noShowRate: null,
      services: [],
      payments: [],
    });
    expect(report.revenue.cents).toBe(0);
  });
});
