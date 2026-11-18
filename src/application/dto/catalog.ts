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
