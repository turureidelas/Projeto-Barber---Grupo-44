import { InvalidValueError } from '../errors/DomainError';
import { WEEKDAYS, type Weekday } from './LocalDate';
import type { TimeWindow } from './TimeWindow';

export interface WorkDay {
  /** Opening and closing time, e.g. 09:00–19:00. */
  readonly hours: TimeWindow;
  /** Breaks inside `hours`, e.g. lunch 12:00–13:00. */
  readonly breaks: readonly TimeWindow[];
}

export type WorkScheduleInput = Partial<Record<Weekday, WorkDay>>;

/** Weekly working hours of a professional ("escala"). Missing weekday = day off. */
export class WorkSchedule {
  private readonly days: ReadonlyMap<Weekday, WorkDay>;

  private constructor(days: ReadonlyMap<Weekday, WorkDay>) {
    this.days = days;
  }

  static create(input: WorkScheduleInput): WorkSchedule {
    const days = new Map<Weekday, WorkDay>();
    for (const weekday of WEEKDAYS) {
      const day = input[weekday];
      if (day) {
        days.set(weekday, validateDay(day));
      }
    }
    return new WorkSchedule(days);
  }

  static empty(): WorkSchedule {
    return new WorkSchedule(new Map());
  }

  dayOf(weekday: Weekday): WorkDay | null {
    return this.days.get(weekday) ?? null;
  }

  workingDays(): Weekday[] {
    return WEEKDAYS.filter((weekday) => this.days.has(weekday));
  }

  /** Bookable windows of a weekday: working hours minus breaks. */
  workingWindowsOn(weekday: Weekday): TimeWindow[] {
    const day = this.days.get(weekday);
    return day ? day.hours.subtract(day.breaks) : [];
  }

  toInput(): WorkScheduleInput {
    return Object.fromEntries(this.days);
  }
}

function validateDay(day: WorkDay): WorkDay {
  const breaks = [...day.breaks].sort(
    (a, b) => a.start.minutesSinceMidnight - b.start.minutesSinceMidnight,
  );
  breaks.forEach((current, index) => {
    if (!day.hours.contains(current)) {
      throw new InvalidValueError('workSchedule', 'breaks must be inside working hours');
    }
    const previous = breaks[index - 1];
    if (previous?.overlaps(current)) {
      throw new InvalidValueError('workSchedule', 'breaks must not overlap');
    }
  });
  return { hours: day.hours, breaks };
}
