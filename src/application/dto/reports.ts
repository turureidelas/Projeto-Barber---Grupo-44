import type { PaymentMethod } from '@domain/entities/Appointment';

/**
 * Ready-to-show management numbers ("Relatórios" / "Meus números").
 * Money in cents; rates as whole percentages (0–100), null when there is nothing to divide.
 */

export type ReportScope = 'BARBERSHOP' | 'PROFESSIONAL';

export interface ReportProfessionalDTO {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly revenueCents: number;
  readonly commissionPercent: number;
  readonly commissionCents: number;
  readonly completed: number;
  readonly noShows: number;
  readonly cancellations: number;
  readonly noShowPercent: number | null;
  readonly occupancyPercent: number | null;
  readonly bookedMinutes: number;
  readonly availableMinutes: number;
}

export interface ReportServiceDTO {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly revenueCents: number;
}

export interface ReportPaymentDTO {
  readonly method: PaymentMethod;
  readonly count: number;
  readonly amountCents: number;
}

export interface ReportClientsDTO {
  /** Distinct clients served in the period. */
  readonly served: number;
  /** Of those, how many had come in the 12 months before. */
  readonly returning: number;
  readonly returningPercent: number | null;
  readonly averageDaysBetweenVisits: number | null;
}

export interface ReportTotalsDTO {
  /** Appointments starting in the period, any status. */
  readonly appointments: number;
  readonly completed: number;
  readonly noShows: number;
  readonly cancellations: number;
  readonly revenueCents: number;
  readonly commissionCents: number;
  readonly averageTicketCents: number | null;
  readonly noShowPercent: number | null;
  readonly occupancyPercent: number | null;
}

export interface ReportDTO {
  /** "yyyy-MM-dd", both included. */
  readonly from: string;
  readonly to: string;
  readonly scope: ReportScope;
  readonly totals: ReportTotalsDTO;
  /** Highest revenue first. A single entry in a professional's own report. */
  readonly professionals: readonly ReportProfessionalDTO[];
  /** Most booked first. */
  readonly services: readonly ReportServiceDTO[];
  readonly payments: readonly ReportPaymentDTO[];
  readonly clients: ReportClientsDTO;
}
