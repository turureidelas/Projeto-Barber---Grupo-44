import type { ChangeRequestedBy, PaymentMethod } from '@domain/entities/Appointment';
import type { AppointmentStatus } from '@domain/entities/AppointmentStatus';

/**
 * DTOs are plain, serializable objects (strings, numbers, booleans) handed to the UI.
 * Instants are ISO 8601 strings; local dates are "yyyy-MM-dd"; money is integer cents.
 */

export interface AppointmentDTO {
  readonly id: string;
  readonly professionalId: string;
  readonly professionalName: string;
  readonly clientId: string;
  readonly clientName: string;
  /** LGPD: masked, e.g. "(11) *****-4321". */
  readonly clientPhoneMasked: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly start: string;
  readonly end: string;
  readonly durationMinutes: number;
  readonly status: AppointmentStatus;
  readonly priceCents: number;
  /** "Cliente faltou" is only allowed from this instant (policy tolerance). */
  readonly noShowAllowedFrom: string;
  /** After this instant, cancelling/rescheduling is "late" (policy minimum notice). */
  readonly changeDeadline: string;
  readonly payment: {
    readonly amountPaidCents: number;
    readonly method: PaymentMethod;
    readonly completedAt: string;
  } | null;
  readonly cancellation: {
    readonly cancelledAt: string;
    readonly cancelledBy: ChangeRequestedBy;
    readonly reason: string | null;
    readonly late: boolean;
  } | null;
}

export interface TimeBlockDTO {
  readonly id: string;
  readonly professionalId: string;
  readonly start: string;
  readonly end: string;
  readonly reason: string | null;
}

export interface AgendaProfessionalDTO {
  readonly id: string;
  readonly name: string;
  readonly photoUrl: string | null;
}

export interface DailySummaryDTO {
  readonly totalAppointments: number;
  readonly completed: number;
  readonly noShows: number;
  readonly cancelled: number;
  /** Still to be attended (scheduled, confirmed or in service). */
  readonly remaining: number;
  /** Sum paid on completed appointments; null when the user cannot see financial data. */
  readonly revenueCents: number | null;
}

export interface DailyAgendaDTO {
  readonly date: string;
  readonly professionals: readonly AgendaProfessionalDTO[];
  /** Sorted by start time. Includes cancelled and no-shows (the UI decides how to show them). */
  readonly appointments: readonly AppointmentDTO[];
  readonly timeBlocks: readonly TimeBlockDTO[];
  /** Clients being attended right now. */
  readonly inService: readonly AppointmentDTO[];
  /** Next client to attend (scheduled/confirmed, not finished yet). */
  readonly next: AppointmentDTO | null;
  readonly summary: DailySummaryDTO;
}

export interface AgendaDayDTO {
  readonly date: string;
  /** Bookable windows ("HH:mm"), already without breaks. Empty = day off. */
  readonly workingHours: readonly { readonly start: string; readonly end: string }[];
  readonly appointments: readonly AppointmentDTO[];
  readonly timeBlocks: readonly TimeBlockDTO[];
}

export interface WeeklyAgendaDTO {
  readonly startDate: string;
  readonly professional: AgendaProfessionalDTO;
  /** Seven consecutive days starting at startDate. */
  readonly days: readonly AgendaDayDTO[];
}

export interface SlotDTO {
  readonly start: string;
  readonly end: string;
}
