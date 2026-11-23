import { assertCanManageAgendaOf } from '@domain/services/access-control';
import { LocalDate } from '@domain/value-objects/LocalDate';
import { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../../dependencies';
import type { AgendaDayDTO, WeeklyAgendaDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { loadProfessionalAgenda } from '../../services/agenda-loader';
import { assembleAppointments, toTimeBlockDTO } from '../../services/assemblers';
import { dayRange } from '../../services/inputs';
import { requireBarbershop, requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface GetWeeklyAgendaInput {
  /** First day shown, "yyyy-MM-dd" (the UI sends Mondays). */
  readonly startDate: string;
  readonly professionalId: string;
}

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'barbershops'
  | 'professionals'
  | 'services'
  | 'clients'
  | 'appointments'
  | 'timeBlocks'
>;

const DAYS_IN_WEEK = 7;

/** Seven days of one professional: working hours, appointments and blocked times per day. */
export class GetWeeklyAgenda implements UseCase<GetWeeklyAgendaInput, WeeklyAgendaDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: GetWeeklyAgendaInput): Promise<WeeklyAgendaDTO> {
    const actor = await requireActor(this.deps);
    const professional = await requireProfessional(this.deps, actor, input.professionalId);
    assertCanManageAgendaOf(actor, professional.id);
    const barbershop = await requireBarbershop(this.deps, actor);

    const dates = Array.from({ length: DAYS_IN_WEEK }, (_, offset) =>
      LocalDate.parse(input.startDate).addDays(offset),
    );
    const firstDay = dates[0] ?? LocalDate.parse(input.startDate);
    const lastDay = dates.at(-1) ?? firstDay;
    const week = TimeRange.create(dayRange(firstDay).start, dayRange(lastDay).end);

    const agenda = await loadProfessionalAgenda(this.deps, professional, week);
    const appointments = await assembleAppointments(this.deps, barbershop, agenda.appointments);

    const days: AgendaDayDTO[] = dates.map((date) => {
      const day = dayRange(date);
      const startsThatDay = (iso: string) => {
        const instant = Date.parse(iso);
        return instant >= day.start.getTime() && instant < day.end.getTime();
      };
      return {
        date: date.toString(),
        workingHours: professional.schedule.workingWindowsOn(date.weekday).map((window) => ({
          start: window.start.toString(),
          end: window.end.toString(),
        })),
        appointments: appointments.filter((appointment) => startsThatDay(appointment.start)),
        timeBlocks: agenda.timeBlocks
          .filter((block) => day.overlaps(block.range))
          .sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
          .map(toTimeBlockDTO),
      };
    });

    return {
      startDate: firstDay.toString(),
      professional: {
        id: professional.id,
        name: professional.name,
        photoUrl: professional.photoUrl,
      },
      days,
    };
  }
}
