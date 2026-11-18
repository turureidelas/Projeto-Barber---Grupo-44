import type { Appointment } from '../entities/Appointment';
import type { AppointmentId, ProfessionalId } from '../entities/ids';
import type { TimeBlock } from '../entities/TimeBlock';
import {
  OutsideWorkingHoursError,
  ScheduleConflictError,
  SlotInPastError,
  TimeBlockedError,
} from '../errors/scheduling-errors';
import { requireIntegerInRange } from '../shared/guards';
import type { Duration } from '../value-objects/Duration';
import { LocalDate } from '../value-objects/LocalDate';
import { TimeOfDay } from '../value-objects/TimeOfDay';
import { TimeRange } from '../value-objects/TimeRange';
import { BUSINESS_TIME_ZONE } from '../value-objects/time-zone';
import type { WorkSchedule } from '../value-objects/WorkSchedule';

/** Everything that occupies a professional's time around the requested slot. */
export interface ProfessionalAgenda {
  readonly professionalId: ProfessionalId;
  readonly schedule: WorkSchedule;
  readonly appointments: readonly Appointment[];
  readonly timeBlocks: readonly TimeBlock[];
}

export interface AvailabilityOptions {
  readonly now: Date;
  /** When rescheduling, the appointment being moved must not conflict with itself. */
  readonly ignoreAppointmentId?: AppointmentId;
}

export type SlotUnavailableReason =
  'SLOT_IN_PAST' | 'OUTSIDE_WORKING_HOURS' | 'TIME_BLOCKED' | 'SCHEDULE_CONFLICT';

export type SlotCheck =
  | { readonly available: true }
  | { readonly available: false; readonly reason: 'SLOT_IN_PAST' | 'OUTSIDE_WORKING_HOURS' }
  | {
      readonly available: false;
      readonly reason: 'TIME_BLOCKED' | 'SCHEDULE_CONFLICT';
      /** ID of the time block or appointment in the way. */
      readonly conflictingId: string;
    };

export interface AvailabilityServiceConfig {
  readonly slotStepMinutes?: number;
  readonly timeZone?: string;
}

/**
 * The availability engine — heart of the system.
 *
 * A slot [start, start + duration) is available only if:
 *  1. it does not start in the past;
 *  2. it fits entirely inside one of the professional's working windows (hours minus breaks);
 *  3. it does not overlap any of the professional's time blocks;
 *  4. it does not overlap any of the professional's ACTIVE appointments.
 * Cancelled / no-show / completed appointments never block a slot.
 */
export class AvailabilityService {
  static readonly DEFAULT_SLOT_STEP_MINUTES = 15;

  private readonly slotStepMinutes: number;
  private readonly timeZone: string;

  constructor(config: AvailabilityServiceConfig = {}) {
    this.slotStepMinutes = requireIntegerInRange(
      'slotStepMinutes',
      config.slotStepMinutes ?? AvailabilityService.DEFAULT_SLOT_STEP_MINUTES,
      5,
      60,
    );
    this.timeZone = config.timeZone ?? BUSINESS_TIME_ZONE;
  }

  checkSlot(agenda: ProfessionalAgenda, slot: TimeRange, options: AvailabilityOptions): SlotCheck {
    if (slot.startsBefore(options.now)) {
      return { available: false, reason: 'SLOT_IN_PAST' };
    }

    const date = LocalDate.fromInstant(slot.start, this.timeZone);
    const fitsWorkingHours = this.workingRangesOn(agenda.schedule, date).some((window) =>
      window.contains(slot),
    );
    if (!fitsWorkingHours) {
      return { available: false, reason: 'OUTSIDE_WORKING_HOURS' };
    }

    const block = agenda.timeBlocks.find(
      (candidate) =>
        candidate.professionalId === agenda.professionalId && candidate.range.overlaps(slot),
    );
    if (block) {
      return { available: false, reason: 'TIME_BLOCKED', conflictingId: block.id };
    }

    const conflict = findActiveConflict(agenda, slot, options.ignoreAppointmentId);
    if (conflict) {
      return { available: false, reason: 'SCHEDULE_CONFLICT', conflictingId: conflict.id };
    }

    return { available: true };
  }

  /**
   * "Bloquear horário": a block cannot start in the past nor cover active appointments
   * (those must be rescheduled or cancelled first). Blocks may overlap other blocks.
   */
  assertCanBlock(agenda: ProfessionalAgenda, range: TimeRange, options: { now: Date }): void {
    if (range.startsBefore(options.now)) {
      throw new SlotInPastError();
    }
    const conflict = findActiveConflict(agenda, range);
    if (conflict) {
      throw new ScheduleConflictError(conflict.id);
    }
  }

  /** Same rules as checkSlot, but throws the matching typed DomainError. */
  assertSlotAvailable(
    agenda: ProfessionalAgenda,
    slot: TimeRange,
    options: AvailabilityOptions,
  ): void {
    const result = this.checkSlot(agenda, slot, options);
    if (result.available) return;

    switch (result.reason) {
      case 'SLOT_IN_PAST':
        throw new SlotInPastError();
      case 'OUTSIDE_WORKING_HOURS':
        throw new OutsideWorkingHoursError();
      case 'TIME_BLOCKED':
        throw new TimeBlockedError(result.conflictingId);
      case 'SCHEDULE_CONFLICT':
        throw new ScheduleConflictError(result.conflictingId);
    }
  }

  /** Every bookable start on `date` for a service of `duration`, on the slot grid (15 min). */
  listAvailableSlots(
    agenda: ProfessionalAgenda,
    date: LocalDate,
    duration: Duration,
    options: AvailabilityOptions,
  ): TimeRange[] {
    const step = this.slotStepMinutes;
    const slots: TimeRange[] = [];

    for (const window of agenda.schedule.workingWindowsOn(date.weekday)) {
      const lastStart = window.end.minutesSinceMidnight - duration.minutes;
      const firstStart = Math.ceil(window.start.minutesSinceMidnight / step) * step;

      for (let minute = firstStart; minute <= lastStart; minute += step) {
        const start = date.at(TimeOfDay.fromMinutes(minute), this.timeZone);
        const slot = TimeRange.startingAt(start, duration);
        if (this.checkSlot(agenda, slot, options).available) {
          slots.push(slot);
        }
      }
    }
    return slots;
  }

  /** The professional's working windows on `date` as real instants (used for occupancy). */
  workingRangesOn(schedule: WorkSchedule, date: LocalDate): TimeRange[] {
    return schedule
      .workingWindowsOn(date.weekday)
      .map((window) =>
        TimeRange.create(date.at(window.start, this.timeZone), date.at(window.end, this.timeZone)),
      );
  }
}

function findActiveConflict(
  agenda: ProfessionalAgenda,
  range: TimeRange,
  ignoreAppointmentId?: AppointmentId,
): Appointment | undefined {
  return agenda.appointments.find(
    (candidate) =>
      candidate.professionalId === agenda.professionalId &&
      candidate.isActive &&
      candidate.id !== ignoreAppointmentId &&
      candidate.range.overlaps(range),
  );
}
