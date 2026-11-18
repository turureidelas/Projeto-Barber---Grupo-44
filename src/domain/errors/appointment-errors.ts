import type { AppointmentAction, AppointmentStatus } from '../entities/AppointmentStatus';
import { DomainError } from './DomainError';

export class InvalidStatusTransitionError extends DomainError {
  readonly code = 'INVALID_STATUS_TRANSITION';
  readonly from: AppointmentStatus;
  readonly action: AppointmentAction;

  constructor(from: AppointmentStatus, action: AppointmentAction) {
    super(`Cannot ${action} an appointment with status ${from}.`);
    this.from = from;
    this.action = action;
  }
}

/** A client tried to cancel/reschedule after the policy's minimum notice. */
export class LateChangeNotAllowedError extends DomainError {
  readonly code = 'LATE_CHANGE_NOT_ALLOWED';
  readonly action: 'cancel' | 'reschedule';
  readonly minNoticeHours: number;

  constructor(action: 'cancel' | 'reschedule', minNoticeHours: number) {
    super(`Clients must ${action} at least ${minNoticeHours}h in advance.`);
    this.action = action;
    this.minNoticeHours = minNoticeHours;
  }
}

/** Staff may cancel after the deadline, but must say why. */
export class CancellationReasonRequiredError extends DomainError {
  readonly code = 'CANCELLATION_REASON_REQUIRED';

  constructor() {
    super('A reason is required to cancel after the policy deadline.');
  }
}

export class NoShowTooEarlyError extends DomainError {
  readonly code = 'NO_SHOW_TOO_EARLY';
  readonly allowedFrom: Date;

  constructor(allowedFrom: Date) {
    super(`No-show can only be recorded from ${allowedFrom.toISOString()}.`);
    this.allowedFrom = allowedFrom;
  }
}
