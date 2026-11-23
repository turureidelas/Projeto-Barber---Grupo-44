import type { Appointment, PaymentMethod, ServiceRecord } from '../entities/Appointment';
import { PAYMENT_METHODS } from '../entities/Appointment';
import type { ClientId, ServiceId } from '../entities/ids';
import type { Professional } from '../entities/Professional';
import type { TimeBlock } from '../entities/TimeBlock';
import { InvalidValueError } from '../errors/DomainError';
import type { LocalDate } from '../value-objects/LocalDate';
import { Money } from '../value-objects/Money';
import type { TimeRange } from '../value-objects/TimeRange';
import type { AvailabilityService } from './AvailabilityService';
import { summarizeClientHistory } from './client-history';

/**
 * Management indicators ("Relatórios"). Pure functions: callers pass the appointments and
 * blocks of the period already loaded; nothing here reads the clock or does I/O.
 */

const MS_PER_MINUTE = 60_000;
/** Longest period a report may cover (one leap year). */
export const MAX_REPORT_DAYS = 366;

/** Every calendar day from `from` to `to`, both included. */
export function periodDates(from: LocalDate, to: LocalDate): LocalDate[] {
  if (to.isBefore(from)) {
    throw new InvalidValueError('reportPeriod', 'end must not be before start');
  }
  const dates: LocalDate[] = [];
  for (let date = from; !to.isBefore(date); date = date.addDays(1)) {
    if (dates.length === MAX_REPORT_DAYS) {
      throw new InvalidValueError(
        'reportPeriod',
        `must cover at most ${String(MAX_REPORT_DAYS)} days`,
      );
    }
    dates.push(date);
  }
  return dates;
}

const completedOf = (appointments: readonly Appointment[]) =>
  appointments.filter((appointment) => appointment.status === 'COMPLETED');

/** What was charged in each completed appointment (only completed ones have a record). */
const recordsOf = (appointments: readonly Appointment[]): ServiceRecord[] =>
  appointments.map((appointment) => appointment.serviceRecord).filter((record) => record !== null);

/** "Faturamento": what was actually paid for completed appointments. */
export function revenueOf(appointments: readonly Appointment[]): Money {
  return Money.sum(recordsOf(appointments).map((record) => record.amountPaid));
}

/** "Índice de faltas": no-shows ÷ (completed + no-shows). null when nobody was expected. */
export function noShowRate(appointments: readonly Appointment[]): number | null {
  const noShows = appointments.filter((appointment) => appointment.status === 'NO_SHOW').length;
  return ratio(noShows, completedOf(appointments).length + noShows);
}

export interface Occupancy {
  /** Minutes booked, except cancelled appointments. */
  readonly bookedMinutes: number;
  /** Working minutes (hours minus breaks) minus blocked minutes. */
  readonly availableMinutes: number;
  /** booked ÷ available, capped at 1. null when there was no working time. */
  readonly rate: number | null;
}

export interface OccupancyInput {
  readonly professional: Pick<Professional, 'id' | 'schedule'>;
  readonly dates: readonly LocalDate[];
  /** Appointments that start in the period. */
  readonly appointments: readonly Appointment[];
  readonly timeBlocks: readonly TimeBlock[];
}

/** "Taxa de ocupação" of one professional: booked minutes ÷ (working minutes − blocks). */
export function occupancyOf(input: OccupancyInput, availability: AvailabilityService): Occupancy {
  const { professional } = input;
  const blocks = input.timeBlocks
    .filter((block) => block.professionalId === professional.id)
    .map((block) => block.range);

  let availableMinutes = 0;
  for (const date of input.dates) {
    for (const window of availability.workingRangesOn(professional.schedule, date)) {
      availableMinutes += window.durationMinutes - coveredMinutes(window, blocks);
    }
  }

  const bookedMinutes = input.appointments
    .filter(
      (appointment) =>
        appointment.professionalId === professional.id && appointment.status !== 'CANCELLED',
    )
    .reduce((total, appointment) => total + appointment.range.durationMinutes, 0);

  return { bookedMinutes, availableMinutes, rate: occupancyRate(bookedMinutes, availableMinutes) };
}

/** Minutes of `window` covered by `ranges` (overlapping ranges are counted once). */
function coveredMinutes(window: TimeRange, ranges: readonly TimeRange[]): number {
  const windowStart = window.start.getTime();
  const windowEnd = window.end.getTime();
  const clipped = ranges
    .map(
      (range) =>
        [
          Math.max(range.start.getTime(), windowStart),
          Math.min(range.end.getTime(), windowEnd),
        ] as const,
    )
    .filter(([start, end]) => start < end)
    .sort((a, b) => a[0] - b[0]);

  let covered = 0;
  let cursor = windowStart;
  for (const [start, end] of clipped) {
    const from = Math.max(start, cursor);
    if (end > from) {
      covered += end - from;
      cursor = end;
    }
  }
  return Math.round(covered / MS_PER_MINUTE);
}

function occupancyRate(booked: number, available: number): number | null {
  const rate = ratio(booked, available);
  return rate === null ? null : Math.min(1, rate);
}

function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

export interface ServiceRanking {
  readonly serviceId: ServiceId;
  /** Appointments booked for it (cancelled ones don't count). */
  readonly count: number;
  readonly revenue: Money;
}

/** "Serviços mais pedidos": most booked first (ties by id, so the order is stable). */
export function rankServices(appointments: readonly Appointment[]): ServiceRanking[] {
  const byService = new Map<ServiceId, { count: number; revenue: Money }>();
  for (const appointment of appointments) {
    if (appointment.status === 'CANCELLED') continue;
    const current = byService.get(appointment.serviceId) ?? { count: 0, revenue: Money.zero() };
    byService.set(appointment.serviceId, {
      count: current.count + 1,
      revenue: current.revenue.add(revenueOf([appointment])),
    });
  }
  return [...byService.entries()]
    .map(([serviceId, totals]) => ({ serviceId, ...totals }))
    .sort((a, b) => b.count - a.count || a.serviceId.localeCompare(b.serviceId));
}

export interface PaymentBreakdown {
  readonly method: PaymentMethod;
  readonly count: number;
  readonly amount: Money;
}

/** Completed appointments per payment method, in the usual order (methods never used are left out). */
export function paymentBreakdown(appointments: readonly Appointment[]): PaymentBreakdown[] {
  const records = recordsOf(appointments);
  return PAYMENT_METHODS.map((method) => {
    const paid = records.filter((record) => record.paymentMethod === method);
    return {
      method,
      count: paid.length,
      amount: Money.sum(paid.map((record) => record.amountPaid)),
    };
  }).filter((entry) => entry.count > 0);
}

export interface ClientReturn {
  /** Distinct clients with a completed visit in the period. */
  readonly served: number;
  /** Of those, how many had a completed visit before the period. */
  readonly returning: number;
  readonly returningRate: number | null;
  /** Mean of each served client's average days between visits (null if nobody came twice). */
  readonly averageDaysBetweenVisits: number | null;
}

/**
 * "Retorno de clientes".
 * @param history completed or not, of any client, up to the end of the period (earlier visits
 *   are only known as far back as the caller loaded them).
 */
export function clientReturn(
  history: readonly Appointment[],
  period: { readonly start: Date; readonly end: Date },
): ClientReturn {
  const startMs = period.start.getTime();
  const endMs = period.end.getTime();
  const upToEnd = history.filter((appointment) => appointment.start.getTime() < endMs);

  const byClient = new Map<ClientId, Appointment[]>();
  for (const appointment of upToEnd) {
    byClient.set(appointment.clientId, [
      ...(byClient.get(appointment.clientId) ?? []),
      appointment,
    ]);
  }

  let served = 0;
  let returning = 0;
  const gaps: number[] = [];
  for (const appointments of byClient.values()) {
    const visits = completedOf(appointments);
    if (!visits.some((visit) => visit.start.getTime() >= startMs)) continue;
    served += 1;
    if (visits.some((visit) => visit.start.getTime() < startMs)) returning += 1;
    const gap = summarizeClientHistory(visits).averageDaysBetweenVisits;
    if (gap !== null) gaps.push(gap);
  }

  return {
    served,
    returning,
    returningRate: ratio(returning, served),
    averageDaysBetweenVisits:
      gaps.length === 0 ? null : Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length),
  };
}

export interface ProfessionalReport {
  readonly professional: Professional;
  readonly revenue: Money;
  /** "Comissão": the professional's share of what was paid. */
  readonly commission: Money;
  readonly completed: number;
  readonly noShows: number;
  readonly cancellations: number;
  readonly noShowRate: number | null;
  readonly occupancy: Occupancy;
}

export interface PeriodReport {
  readonly revenue: Money;
  readonly commission: Money;
  /** Appointments starting in the period, any status. */
  readonly appointments: number;
  readonly completed: number;
  readonly noShows: number;
  readonly cancellations: number;
  readonly noShowRate: number | null;
  /** "Ticket médio": revenue ÷ completed. */
  readonly averageTicket: Money | null;
  readonly occupancy: Occupancy;
  readonly professionals: readonly ProfessionalReport[];
  readonly services: readonly ServiceRanking[];
  readonly payments: readonly PaymentBreakdown[];
  readonly clients: ClientReturn;
}

export interface PeriodReportInput {
  readonly from: LocalDate;
  readonly to: LocalDate;
  /** Instants where the period starts and ends ([start, end)). */
  readonly range: { readonly start: Date; readonly end: Date };
  /** Whose numbers to report (everyone, or a single professional). */
  readonly professionals: readonly Professional[];
  /**
   * Appointments of those professionals, any status, starting before `range.end`.
   * The ones before `range.start` are only used to know which clients came back.
   */
  readonly appointments: readonly Appointment[];
  readonly timeBlocks: readonly TimeBlock[];
}

/** Every indicator of the period, total and per professional. */
export function buildPeriodReport(
  input: PeriodReportInput,
  availability: AvailabilityService,
): PeriodReport {
  const dates = periodDates(input.from, input.to);
  const reported = new Set(input.professionals.map((professional) => professional.id));
  const startMs = input.range.start.getTime();
  const endMs = input.range.end.getTime();
  const history = input.appointments.filter((appointment) =>
    reported.has(appointment.professionalId),
  );
  const inPeriod = history.filter(
    (appointment) => appointment.start.getTime() >= startMs && appointment.start.getTime() < endMs,
  );

  const professionals = input.professionals.map((professional): ProfessionalReport => {
    const own = inPeriod.filter((appointment) => appointment.professionalId === professional.id);
    const revenue = revenueOf(own);
    return {
      professional,
      revenue,
      commission: professional.commissionOn(revenue),
      ...countStatuses(own),
      noShowRate: noShowRate(own),
      occupancy: occupancyOf(
        { professional, dates, appointments: own, timeBlocks: input.timeBlocks },
        availability,
      ),
    };
  });

  const revenue = revenueOf(inPeriod);
  const counts = countStatuses(inPeriod);
  const bookedMinutes = sumOf(professionals, (report) => report.occupancy.bookedMinutes);
  const availableMinutes = sumOf(professionals, (report) => report.occupancy.availableMinutes);

  return {
    revenue,
    commission: Money.sum(professionals.map((report) => report.commission)),
    appointments: inPeriod.length,
    ...counts,
    noShowRate: noShowRate(inPeriod),
    averageTicket:
      counts.completed === 0 ? null : Money.fromCents(Math.round(revenue.cents / counts.completed)),
    occupancy: {
      bookedMinutes,
      availableMinutes,
      rate: occupancyRate(bookedMinutes, availableMinutes),
    },
    professionals,
    services: rankServices(inPeriod),
    payments: paymentBreakdown(inPeriod),
    clients: clientReturn(history, input.range),
  };
}

function countStatuses(appointments: readonly Appointment[]) {
  const count = (status: Appointment['status']) =>
    appointments.filter((appointment) => appointment.status === status).length;
  return {
    completed: count('COMPLETED'),
    noShows: count('NO_SHOW'),
    cancellations: count('CANCELLED'),
  };
}

function sumOf<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
