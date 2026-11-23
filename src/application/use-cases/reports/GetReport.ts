import type { Professional } from '@domain/entities/Professional';
import type { User } from '@domain/entities/User';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { canViewReportsOf, hasPermission } from '@domain/services/access-control';
import { buildPeriodReport, periodDates, type PeriodReport } from '@domain/services/reports';
import { LocalDate } from '@domain/value-objects/LocalDate';
import { TimeRange } from '@domain/value-objects/TimeRange';
import type { ApplicationDependencies } from '../../dependencies';
import type { ReportDTO, ReportProfessionalDTO, ReportScope } from '../../dto/reports';
import { requireActor } from '../../services/actor';
import { dayRange } from '../../services/inputs';
import { requireProfessional } from '../../services/lookups';
import type { UseCase } from '../UseCase';

export interface GetReportInput {
  /** "yyyy-MM-dd", both included. */
  readonly from: string;
  readonly to: string;
  /** Only this professional (owner). Professionals always get their own numbers. */
  readonly professionalId?: string;
}

type Deps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'availability'
  | 'professionals'
  | 'services'
  | 'appointments'
  | 'timeBlocks'
>;

/** How far back we look to know whether a client of the period had come before. */
export const RETURN_LOOKBACK_DAYS = 365;

const percent = (rate: number | null) => (rate === null ? null : Math.round(rate * 100));

/**
 * "Relatórios": revenue, commission, occupancy, no-shows, top services and returning clients.
 * The owner sees the whole barbershop; a professional only their own numbers ("Meus números").
 */
export class GetReport implements UseCase<GetReportInput, ReportDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: GetReportInput): Promise<ReportDTO> {
    const actor = await requireActor(this.deps);
    const from = LocalDate.parse(input.from);
    const to = LocalDate.parse(input.to);
    periodDates(from, to); // rejects an invalid period before loading anything
    const range = TimeRange.create(dayRange(from).start, dayRange(to).end);

    const { scope, professionals } = await this.reportedProfessionals(actor, input.professionalId);
    const query = {
      barbershopId: actor.barbershopId,
      professionalId: scope === 'PROFESSIONAL' ? professionals[0]?.id : undefined,
    };
    const lookbackStart = dayRange(from.addDays(-RETURN_LOOKBACK_DAYS)).start;
    const [appointments, timeBlocks, services] = await Promise.all([
      this.deps.appointments.listInRange({
        ...query,
        range: TimeRange.create(lookbackStart, range.end),
      }),
      this.deps.timeBlocks.listInRange({ ...query, range }),
      this.deps.services.listByBarbershop(actor.barbershopId),
    ]);

    // Inactive professionals only show up when they had appointments in the period.
    const reported = professionals.filter(
      (professional) =>
        professional.active ||
        appointments.some(
          (appointment) =>
            appointment.professionalId === professional.id && range.overlaps(appointment.range),
        ),
    );

    const report = buildPeriodReport(
      { from, to, range, professionals: reported, appointments, timeBlocks },
      this.deps.availability,
    );
    const serviceNames = new Map(services.map((service) => [service.id, service.name]));

    return {
      from: from.toString(),
      to: to.toString(),
      scope,
      totals: {
        appointments: report.appointments,
        completed: report.completed,
        noShows: report.noShows,
        cancellations: report.cancellations,
        revenueCents: report.revenue.cents,
        commissionCents: report.commission.cents,
        averageTicketCents: report.averageTicket?.cents ?? null,
        noShowPercent: percent(report.noShowRate),
        occupancyPercent: percent(report.occupancy.rate),
      },
      professionals: toProfessionalDTOs(report),
      services: report.services.map((entry) => ({
        id: entry.serviceId,
        name: serviceNames.get(entry.serviceId) ?? '',
        count: entry.count,
        revenueCents: entry.revenue.cents,
      })),
      payments: report.payments.map((entry) => ({
        method: entry.method,
        count: entry.count,
        amountCents: entry.amount.cents,
      })),
      clients: {
        served: report.clients.served,
        returning: report.clients.returning,
        returningPercent: percent(report.clients.returningRate),
        averageDaysBetweenVisits: report.clients.averageDaysBetweenVisits,
      },
    };
  }

  private async reportedProfessionals(
    actor: User,
    professionalId: string | undefined,
  ): Promise<{ scope: ReportScope; professionals: Professional[] }> {
    if (hasPermission(actor, 'reports:view-all') && professionalId === undefined) {
      const all = await this.deps.professionals.listByBarbershop(actor.barbershopId);
      return { scope: 'BARBERSHOP', professionals: all };
    }
    // A professional's own report, whatever id the UI sent.
    const requested = hasPermission(actor, 'reports:view-all')
      ? professionalId
      : actor.professionalId;
    if (!requested || !hasPermission(actor, 'reports:view-own')) {
      throw new PermissionDeniedError('reports:view-own');
    }
    const professional = await requireProfessional(this.deps, actor, requested);
    if (!canViewReportsOf(actor, professional.id)) {
      throw new PermissionDeniedError('reports:view-own');
    }
    return { scope: 'PROFESSIONAL', professionals: [professional] };
  }
}

function toProfessionalDTOs(report: PeriodReport): ReportProfessionalDTO[] {
  return report.professionals
    .map(({ professional, occupancy, ...entry }) => ({
      id: professional.id,
      name: professional.name,
      photoUrl: professional.photoUrl,
      revenueCents: entry.revenue.cents,
      commissionPercent: professional.commission.value,
      commissionCents: entry.commission.cents,
      completed: entry.completed,
      noShows: entry.noShows,
      cancellations: entry.cancellations,
      noShowPercent: percent(entry.noShowRate),
      occupancyPercent: percent(occupancy.rate),
      bookedMinutes: occupancy.bookedMinutes,
      availableMinutes: occupancy.availableMinutes,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name, 'pt-BR'));
}
