export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Statuses that occupy the professional's time (block other bookings). */
export const ACTIVE_STATUSES: readonly AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_SERVICE',
];

export type AppointmentAction =
  'confirm' | 'markArrived' | 'markNoShow' | 'complete' | 'cancel' | 'reschedule';

/** Which statuses each action can start from. Anything else is an invalid transition. */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<AppointmentAction, readonly AppointmentStatus[]>
> = {
  confirm: ['SCHEDULED'],
  // NO_SHOW → IN_SERVICE undoes a "faltou" when the client shows up late.
  markArrived: ['SCHEDULED', 'CONFIRMED', 'NO_SHOW'],
  markNoShow: ['SCHEDULED', 'CONFIRMED'],
  // Completing straight from SCHEDULED/CONFIRMED keeps the main flow at one tap.
  complete: ['SCHEDULED', 'CONFIRMED', 'IN_SERVICE'],
  cancel: ['SCHEDULED', 'CONFIRMED'],
  reschedule: ['SCHEDULED', 'CONFIRMED'],
};

export function isActiveStatus(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
