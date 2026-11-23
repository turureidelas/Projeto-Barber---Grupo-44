import type { Appointment } from '@domain/entities/Appointment';
import type { Barbershop } from '@domain/entities/Barbershop';
import type { Client } from '@domain/entities/Client';
import type { Professional } from '@domain/entities/Professional';
import type { Service } from '@domain/entities/Service';
import type { TimeBlock } from '@domain/entities/TimeBlock';
import type { User } from '@domain/entities/User';
import { permissionsFor } from '@domain/services/access-control';
import type { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import type { ApplicationDependencies } from '../dependencies';
import type { AppointmentDTO, TimeBlockDTO } from '../dto/agenda';
import type {
  BarbershopDTO,
  ClientSummaryDTO,
  ProfessionalDetailsDTO,
  ProfessionalDTO,
  ServiceDTO,
  SessionUserDTO,
} from '../dto/catalog';
import { NotFoundError, type ResourceName } from '../errors';

/** Entity → DTO conversions. DTOs are plain objects safe to cache and render. */

interface AppointmentLookups {
  readonly professionals: ReadonlyMap<string, Professional>;
  readonly services: ReadonlyMap<string, Service>;
  readonly clients: ReadonlyMap<string, Client>;
  readonly policy: CancellationPolicy;
}

type LookupDeps = Pick<ApplicationDependencies, 'professionals' | 'services' | 'clients'>;

/** Builds DTOs (with professional, client and service names), sorted by start time. */
export async function assembleAppointments(
  deps: LookupDeps,
  barbershop: Barbershop,
  appointments: readonly Appointment[],
): Promise<AppointmentDTO[]> {
  const clientIds = [...new Set(appointments.map((appointment) => appointment.clientId))];
  const [professionals, services, clients] = await Promise.all([
    deps.professionals.listByBarbershop(barbershop.id),
    deps.services.listByBarbershop(barbershop.id),
    deps.clients.findByIds(clientIds),
  ]);
  const lookups: AppointmentLookups = {
    professionals: byId(professionals),
    services: byId(services),
    clients: byId(clients),
    policy: barbershop.cancellationPolicy,
  };
  return [...appointments]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((appointment) => toAppointmentDTO(appointment, lookups));
}

export async function assembleAppointment(
  deps: LookupDeps,
  barbershop: Barbershop,
  appointment: Appointment,
): Promise<AppointmentDTO> {
  const [dto] = await assembleAppointments(deps, barbershop, [appointment]);
  if (!dto) {
    throw new NotFoundError('appointment', appointment.id);
  }
  return dto;
}

function toAppointmentDTO(appointment: Appointment, lookups: AppointmentLookups): AppointmentDTO {
  const professional = lookup(lookups.professionals, appointment.professionalId, 'professional');
  const client = lookup(lookups.clients, appointment.clientId, 'client');
  const service = lookup(lookups.services, appointment.serviceId, 'service');
  const { serviceRecord, cancellation } = appointment;

  return {
    id: appointment.id,
    professionalId: professional.id,
    professionalName: professional.name,
    clientId: client.id,
    clientName: client.name,
    clientPhoneMasked: client.phone.masked(),
    serviceId: service.id,
    serviceName: service.name,
    start: appointment.start.toISOString(),
    end: appointment.end.toISOString(),
    durationMinutes: appointment.range.durationMinutes,
    status: appointment.status,
    priceCents: appointment.price.cents,
    noShowAllowedFrom: lookups.policy.noShowAllowedFrom(appointment.start).toISOString(),
    changeDeadline: lookups.policy.changeDeadline(appointment.start).toISOString(),
    payment: serviceRecord && {
      amountPaidCents: serviceRecord.amountPaid.cents,
      method: serviceRecord.paymentMethod,
      completedAt: serviceRecord.completedAt.toISOString(),
    },
    cancellation: cancellation && {
      cancelledAt: cancellation.cancelledAt.toISOString(),
      cancelledBy: cancellation.cancelledBy,
      reason: cancellation.reason,
      late: cancellation.late,
    },
  };
}

export function toTimeBlockDTO(block: TimeBlock): TimeBlockDTO {
  return {
    id: block.id,
    professionalId: block.professionalId,
    start: block.range.start.toISOString(),
    end: block.range.end.toISOString(),
    reason: block.reason,
  };
}

export function toProfessionalDTO(
  professional: Professional,
  canSeeCommission: boolean,
): ProfessionalDTO {
  return {
    id: professional.id,
    name: professional.name,
    specialty: professional.specialty,
    photoUrl: professional.photoUrl,
    active: professional.active,
    commissionPercent: canSeeCommission ? professional.commission.value : null,
  };
}

/** Full record for whoever manages the team (commission and weekly hours). */
export function toProfessionalDetailsDTO(professional: Professional): ProfessionalDetailsDTO {
  return {
    ...toProfessionalDTO(professional, true),
    commissionPercent: professional.commission.value,
    schedule: professional.schedule.workingDays().flatMap((weekday) => {
      const day = professional.schedule.dayOf(weekday);
      return day
        ? [
            {
              weekday,
              start: day.hours.start.toString(),
              end: day.hours.end.toString(),
              breaks: day.breaks.map((pause) => ({
                start: pause.start.toString(),
                end: pause.end.toString(),
              })),
            },
          ]
        : [];
    }),
  };
}

export function toServiceDTO(service: Service): ServiceDTO {
  return {
    id: service.id,
    name: service.name,
    kind: service.kind,
    durationMinutes: service.duration.minutes,
    priceCents: service.price.cents,
    includedServiceIds: [...service.includedServiceIds],
    active: service.active,
  };
}

export function toClientSummaryDTO(client: Client): ClientSummaryDTO {
  return {
    id: client.id,
    name: client.name,
    phoneMasked: client.phone.masked(),
    emailMasked: client.email?.masked() ?? null,
  };
}

export function toSessionUserDTO(user: User): SessionUserDTO {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    barbershopId: user.barbershopId,
    professionalId: user.professionalId,
    permissions: [...permissionsFor(user)],
  };
}

export function toBarbershopDTO(barbershop: Barbershop): BarbershopDTO {
  return {
    id: barbershop.id,
    name: barbershop.name,
    phone: barbershop.phone.formatted(),
    address: barbershop.address,
    cancellationPolicy: {
      minNoticeHours: barbershop.cancellationPolicy.minNoticeHours,
      noShowToleranceMinutes: barbershop.cancellationPolicy.noShowToleranceMinutes,
    },
  };
}

function byId<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function lookup<T>(map: ReadonlyMap<string, T>, id: string, resource: ResourceName): T {
  const found = map.get(id);
  if (found === undefined) {
    throw new NotFoundError(resource, id);
  }
  return found;
}
