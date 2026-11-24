/**
 * Plain JSON shapes used to persist entities (localStorage today, API payloads tomorrow).
 * Instants are ISO 8601 strings, money is integer cents, wall-clock times are "HH:mm".
 */

export interface BarbershopRow {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  cancellationPolicy: { minNoticeHours: number; noShowToleranceMinutes: number };
}

export interface UserRow {
  id: string;
  barbershopId: string;
  name: string;
  email: string;
  role: string;
  professionalId: string | null;
  /** Client accounts only. Optional: rows saved before client accounts existed don't have it. */
  clientId?: string | null;
}

export interface WorkDayRow {
  weekday: number;
  hours: [string, string];
  breaks: [string, string][];
}

export interface ProfessionalRow {
  id: string;
  barbershopId: string;
  name: string;
  specialty: string | null;
  photoUrl: string | null;
  commissionPercent: number;
  schedule: WorkDayRow[];
  active: boolean;
}

export interface ServiceRow {
  id: string;
  barbershopId: string;
  name: string;
  kind: string;
  durationMinutes: number;
  priceCents: number;
  includedServiceIds: string[];
  active: boolean;
}

export interface ClientRow {
  id: string;
  barbershopId: string;
  name: string;
  /** null once anonymized. */
  phone: string | null;
  email: string | null;
  consent: { grantedAt: string; termsVersion: string; channel: string } | null;
  createdAt: string;
  /** Optional: rows saved before anonymization existed don't have it. */
  anonymizedAt?: string | null;
}

export interface AppointmentRow {
  id: string;
  barbershopId: string;
  professionalId: string;
  clientId: string;
  serviceId: string;
  start: string;
  end: string;
  priceCents: number;
  status: string;
  createdAt: string;
  cancellation: {
    cancelledAt: string;
    cancelledBy: string;
    reason: string | null;
    late: boolean;
  } | null;
  serviceRecord: { amountPaidCents: number; paymentMethod: string; completedAt: string } | null;
}

export interface TimeBlockRow {
  id: string;
  barbershopId: string;
  professionalId: string;
  start: string;
  end: string;
  reason: string | null;
  createdBy: string;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  barbershopId: string;
  kind: string;
  appointmentId: string;
  professionalId: string;
  clientId: string;
  serviceId: string;
  previousStart: string;
  newStart: string | null;
  createdAt: string;
  readBy: string[];
}
