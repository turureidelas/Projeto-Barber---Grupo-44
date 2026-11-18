import { DomainError } from './DomainError';

export class SlotInPastError extends DomainError {
  readonly code = 'SLOT_IN_PAST';

  constructor() {
    super('The requested time has already passed.');
  }
}

/** Outside the professional's working hours (includes breaks and days off). */
export class OutsideWorkingHoursError extends DomainError {
  readonly code = 'OUTSIDE_WORKING_HOURS';

  constructor() {
    super("The requested time is outside the professional's working hours.");
  }
}

export class TimeBlockedError extends DomainError {
  readonly code = 'TIME_BLOCKED';
  readonly timeBlockId: string;

  constructor(timeBlockId: string) {
    super(`The requested time overlaps time block ${timeBlockId}.`);
    this.timeBlockId = timeBlockId;
  }
}

export class ScheduleConflictError extends DomainError {
  readonly code = 'SCHEDULE_CONFLICT';
  readonly conflictingAppointmentId: string;

  constructor(conflictingAppointmentId: string) {
    super(`The requested time overlaps appointment ${conflictingAppointmentId}.`);
    this.conflictingAppointmentId = conflictingAppointmentId;
  }
}
