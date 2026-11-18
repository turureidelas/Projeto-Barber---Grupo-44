import type { AppointmentStatus } from '@domain/entities/AppointmentStatus';
import { canManageAgendaOf, hasPermission } from '@domain/services/access-control';
import { LocalDate } from '@domain/value-objects/LocalDate';
import type { ApplicationDependencies } from '../../dependencies';
import type { AppointmentDTO, DailyAgendaDTO, DailySummaryDTO } from '../../dto/agenda';
import { requireActor } from '../../services/actor';
import { assembleAppointments, toTimeBlockDTO } from '../../services/assemblers';
import { dayRange } from '../../services/inputs';
import { requireBarbershop } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface GetDailyAgendaInput {
  /** "yyyy-MM-dd" */
  readonly date: string;
  /** Show a single professional. Professionals always see only their own agenda. */
  readonly professionalId?: string;
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

const WAITING: readonly AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];

/** Home screen: the day's appointments, who is next, and a short summary. */
export class GetDailyAgenda implements UseCase<GetDailyAgendaInput, DailyAgendaDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: GetDailyAgendaInput): Promise<DailyAgendaDTO> {
    const actor = await requireActor(this.deps);
    const barbershop = await requireBarbershop(this.deps, actor);
    const date = LocalDate.parse(input.date);

    const professionals = (await this.deps.professionals.listByBarbershop(barbershop.id))
      .filter((professional) => professional.active && canManageAgendaOf(actor, professional.id))
      .filter((professional) => !input.professionalId || professional.id === input.professionalId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const visible = new Set<string>(professionals.map((professional) => professional.id));

    const query = { barbershopId: barbershop.id, range: dayRange(date) };
    const [appointments, timeBlocks] = await Promise.all([
      this.deps.appointments.listInRange(query),
      this.deps.timeBlocks.listInRange(query),
    ]);

    const dtos = await assembleAppointments(
      this.deps,
      barbershop,
      appointments.filter((appointment) => visible.has(appointment.professionalId)),
    );
    const now = this.deps.clock.now().getTime();
    const canSeeRevenue =
      hasPermission(actor, 'reports:view-all') || hasPermission(actor, 'reports:view-own');

    return {
      date: date.toString(),
      professionals: professionals.map((professional) => ({
        id: professional.id,
        name: professional.name,
        photoUrl: professional.photoUrl,
      })),
      appointments: dtos,
      timeBlocks: timeBlocks
        .filter((block) => visible.has(block.professionalId))
        .sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
        .map(toTimeBlockDTO),
      inService: dtos.filter((appointment) => appointment.status === 'IN_SERVICE'),
      next:
        dtos.find(
          (appointment) =>
            WAITING.includes(appointment.status) && Date.parse(appointment.end) > now,
        ) ?? null,
      summary: summarize(dtos, canSeeRevenue),
    };
  }
}

function summarize(
  appointments: readonly AppointmentDTO[],
  canSeeRevenue: boolean,
): DailySummaryDTO {
  const count = (...statuses: AppointmentStatus[]) =>
    appointments.filter((appointment) => statuses.includes(appointment.status)).length;
  const revenueCents = appointments.reduce(
    (total, appointment) => total + (appointment.payment?.amountPaidCents ?? 0),
    0,
  );
  return {
    totalAppointments: appointments.length - count('CANCELLED'),
    completed: count('COMPLETED'),
    noShows: count('NO_SHOW'),
    cancelled: count('CANCELLED'),
    remaining: count('SCHEDULED', 'CONFIRMED', 'IN_SERVICE'),
    revenueCents: canSeeRevenue ? revenueCents : null,
  };
}
