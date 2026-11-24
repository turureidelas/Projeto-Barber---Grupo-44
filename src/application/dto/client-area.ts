import type { AppointmentDTO } from './agenda';

/** What a signed-in client sees about their own bookings. */
export interface MyAppointmentsDTO {
  /** Active and not over yet, soonest first. */
  readonly upcoming: readonly AppointmentDTO[];
  /** Done, cancelled, missed or already over — most recent first. */
  readonly past: readonly AppointmentDTO[];
}

/** The client's own record (their own data, so the phone is shown in full). */
export interface ClientProfileDTO {
  readonly name: string;
  /** Formatted, e.g. "(11) 98765-4321". */
  readonly phone: string | null;
  readonly email: string | null;
  readonly consent: {
    readonly grantedAt: string;
    readonly termsVersion: string;
    readonly channel: 'APP' | 'PANEL';
  } | null;
  readonly createdAt: string;
}
