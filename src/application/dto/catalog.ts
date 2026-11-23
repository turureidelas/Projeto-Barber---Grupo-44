import type { AppointmentDTO } from './agenda';
import type { ServiceKind } from '@domain/entities/Service';
import type { Role } from '@domain/entities/User';
import type { Permission } from '@domain/services/access-control';

export interface SessionUserDTO {
  readonly id: string;
  readonly name: string;
  readonly role: Role;
  readonly barbershopId: string;
  /** Set when the user also attends clients (professional or owner who cuts hair). */
  readonly professionalId: string | null;
  readonly permissions: readonly Permission[];
}

export interface ProfessionalDTO {
  readonly id: string;
  readonly name: string;
  readonly specialty: string | null;
  readonly photoUrl: string | null;
  readonly active: boolean;
  /** Only visible to whoever manages professionals; null otherwise. */
  readonly commissionPercent: number | null;
}

export interface WorkDayDTO {
  /** 0 = Sunday … 6 = Saturday. */
  readonly weekday: number;
  readonly start: string;
  readonly end: string;
  readonly breaks: readonly { readonly start: string; readonly end: string }[];
}

export interface ProfessionalDetailsDTO extends ProfessionalDTO {
  readonly commissionPercent: number;
  /** Working days only; missing weekdays are days off. */
  readonly schedule: readonly WorkDayDTO[];
}

export interface ServiceDTO {
  readonly id: string;
  readonly name: string;
  readonly kind: ServiceKind;
  readonly durationMinutes: number;
  readonly priceCents: number;
  readonly includedServiceIds: readonly string[];
  readonly active: boolean;
}

/** LGPD: listing shows masked contact data only. */
export interface ClientSummaryDTO {
  readonly id: string;
  readonly name: string;
  readonly phoneMasked: string;
  readonly emailMasked: string | null;
}

export interface ClientStatsDTO {
  readonly visits: number;
  readonly noShows: number;
  readonly cancellations: number;
  readonly lastVisit: string | null;
  /** "Frequência de retorno" in days; null with fewer than two visits. */
  readonly averageDaysBetweenVisits: number | null;
  readonly totalSpentCents: number;
}

/** Full record for whoever manages clients (needed to call the client). */
export interface ClientDetailsDTO {
  readonly id: string;
  readonly name: string;
  /** Formatted, e.g. "(11) 98765-4321". */
  readonly phone: string;
  readonly email: string | null;
  readonly consent: {
    readonly grantedAt: string;
    readonly termsVersion: string;
    readonly channel: 'APP' | 'PANEL';
  } | null;
  readonly createdAt: string;
  readonly stats: ClientStatsDTO;
  /** Most recent first. */
  readonly history: readonly AppointmentDTO[];
}

export interface BarbershopDTO {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly cancellationPolicy: {
    readonly minNoticeHours: number;
    readonly noShowToleranceMinutes: number;
  };
}
