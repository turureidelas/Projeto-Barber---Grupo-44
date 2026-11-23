import type { Appointment } from '../entities/Appointment';
import { Money } from '../value-objects/Money';

const MS_PER_DAY = 86_400_000;

export interface ClientHistorySummary {
  /** Completed appointments. */
  readonly visits: number;
  readonly noShows: number;
  readonly cancellations: number;
  /** Start of the most recent completed visit. */
  readonly lastVisit: Date | null;
  /** "Frequência de retorno": average days between consecutive visits (null with < 2 visits). */
  readonly averageDaysBetweenVisits: number | null;
  /** Sum of what was actually paid. */
  readonly totalSpent: Money;
}

/** How a client relates to the barbershop, from their appointment history. */
export function summarizeClientHistory(appointments: readonly Appointment[]): ClientHistorySummary {
  const visits = appointments
    .filter((appointment) => appointment.status === 'COMPLETED')
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const first = visits[0];
  const last = visits.at(-1);
  // The mean of consecutive gaps equals (last − first) / (visits − 1).
  const averageGap =
    first && last && visits.length > 1
      ? (last.start.getTime() - first.start.getTime()) / (visits.length - 1)
      : null;

  return {
    visits: visits.length,
    noShows: appointments.filter((appointment) => appointment.status === 'NO_SHOW').length,
    cancellations: appointments.filter((appointment) => appointment.status === 'CANCELLED').length,
    lastVisit: last ? last.start : null,
    averageDaysBetweenVisits: averageGap === null ? null : Math.round(averageGap / MS_PER_DAY),
    totalSpent: Money.sum(
      visits
        .map((visit) => visit.serviceRecord)
        .filter((record) => record !== null)
        .map((record) => record.amountPaid),
    ),
  };
}
