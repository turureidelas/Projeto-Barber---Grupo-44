import { Appointment, PAYMENT_METHODS, type ChangeRequestedBy } from '@domain/entities/Appointment';
import { APPOINTMENT_STATUSES } from '@domain/entities/AppointmentStatus';
import { Barbershop } from '@domain/entities/Barbershop';
import { Client, CONSENT_CHANNELS } from '@domain/entities/Client';
import { toId } from '@domain/entities/ids';
import { Professional } from '@domain/entities/Professional';
import { Service, SERVICE_KINDS } from '@domain/entities/Service';
import { TimeBlock } from '@domain/entities/TimeBlock';
import { NOTIFICATION_KINDS, Notification } from '@domain/entities/Notification';
import { ROLES, User } from '@domain/entities/User';
import { InvalidValueError } from '@domain/errors/DomainError';
import { requireValidDate } from '@domain/shared/guards';
import { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import { Duration } from '@domain/value-objects/Duration';
import { Email } from '@domain/value-objects/Email';
import { WEEKDAYS, type Weekday } from '@domain/value-objects/LocalDate';
import { Money } from '@domain/value-objects/Money';
import { Percentage } from '@domain/value-objects/Percentage';
import { Phone } from '@domain/value-objects/Phone';
import { TimeRange } from '@domain/value-objects/TimeRange';
import { TimeWindow } from '@domain/value-objects/TimeWindow';
import { WorkSchedule, type WorkScheduleInput } from '@domain/value-objects/WorkSchedule';
import type {
  AppointmentRow,
  BarbershopRow,
  ClientRow,
  NotificationRow,
  ProfessionalRow,
  ServiceRow,
  TimeBlockRow,
  UserRow,
} from './rows';

/**
 * Row ⇄ entity. Reading always goes through the domain factories, so corrupted or
 * outdated stored data fails loudly instead of leaking invalid state into the app.
 */

function oneOf<T extends string>(field: string, value: string, allowed: readonly T[]): T {
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new InvalidValueError(field, `unknown value "${value}"`);
  }
  return match;
}

const date = (field: string, iso: string): Date => requireValidDate(field, new Date(iso));
const iso = (value: Date): string => value.toISOString();
const range = (start: string, end: string) =>
  TimeRange.create(date('start', start), date('end', end));

// Barbershop

export function barbershopFromRow(row: BarbershopRow): Barbershop {
  return Barbershop.create({
    id: toId(row.id),
    name: row.name,
    phone: Phone.parse(row.phone),
    address: row.address,
    cancellationPolicy: CancellationPolicy.create(row.cancellationPolicy),
  });
}

export function barbershopToRow(barbershop: Barbershop): BarbershopRow {
  return {
    id: barbershop.id,
    name: barbershop.name,
    phone: barbershop.phone.digits,
    address: barbershop.address,
    cancellationPolicy: {
      minNoticeHours: barbershop.cancellationPolicy.minNoticeHours,
      noShowToleranceMinutes: barbershop.cancellationPolicy.noShowToleranceMinutes,
    },
  };
}

// User

export function userFromRow(row: UserRow): User {
  return User.create({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    name: row.name,
    email: Email.parse(row.email),
    role: oneOf('role', row.role, ROLES),
    professionalId: row.professionalId === null ? null : toId(row.professionalId),
    clientId: row.clientId == null ? null : toId(row.clientId),
  });
}

export function userToRow(user: User): UserRow {
  return {
    id: user.id,
    barbershopId: user.barbershopId,
    name: user.name,
    email: user.email.value,
    role: user.role,
    professionalId: user.professionalId,
    clientId: user.clientId,
  };
}

// Professional

function scheduleFromRows(rows: readonly ProfessionalRow['schedule'][number][]): WorkSchedule {
  const input: WorkScheduleInput = {};
  for (const day of rows) {
    const weekday = WEEKDAYS.find((candidate) => candidate === day.weekday);
    if (weekday === undefined) {
      throw new InvalidValueError('weekday', `unknown value "${String(day.weekday)}"`);
    }
    input[weekday] = {
      hours: TimeWindow.parse(...day.hours),
      breaks: day.breaks.map((pause) => TimeWindow.parse(...pause)),
    };
  }
  return WorkSchedule.create(input);
}

function scheduleToRows(schedule: WorkSchedule): ProfessionalRow['schedule'] {
  return schedule.workingDays().flatMap((weekday: Weekday) => {
    const day = schedule.dayOf(weekday);
    return day
      ? [
          {
            weekday,
            hours: [day.hours.start.toString(), day.hours.end.toString()] as [string, string],
            breaks: day.breaks.map(
              (pause) => [pause.start.toString(), pause.end.toString()] as [string, string],
            ),
          },
        ]
      : [];
  });
}

export function professionalFromRow(row: ProfessionalRow): Professional {
  return Professional.create({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    name: row.name,
    specialty: row.specialty,
    photoUrl: row.photoUrl,
    commission: Percentage.of(row.commissionPercent),
    schedule: scheduleFromRows(row.schedule),
    active: row.active,
  });
}

export function professionalToRow(professional: Professional): ProfessionalRow {
  return {
    id: professional.id,
    barbershopId: professional.barbershopId,
    name: professional.name,
    specialty: professional.specialty,
    photoUrl: professional.photoUrl,
    commissionPercent: professional.commission.value,
    schedule: scheduleToRows(professional.schedule),
    active: professional.active,
  };
}

// Service

export function serviceFromRow(row: ServiceRow): Service {
  return Service.restore({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    name: row.name,
    kind: oneOf('serviceKind', row.kind, SERVICE_KINDS),
    duration: Duration.ofMinutes(row.durationMinutes),
    price: Money.fromCents(row.priceCents),
    includedServiceIds: row.includedServiceIds.map((id) => toId(id)),
    active: row.active,
  });
}

export function serviceToRow(service: Service): ServiceRow {
  return {
    id: service.id,
    barbershopId: service.barbershopId,
    name: service.name,
    kind: service.kind,
    durationMinutes: service.duration.minutes,
    priceCents: service.price.cents,
    includedServiceIds: [...service.includedServiceIds],
    active: service.active,
  };
}

// Client

export function clientFromRow(row: ClientRow): Client {
  return Client.create({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    name: row.name,
    phone: row.phone === null ? null : Phone.parse(row.phone),
    email: row.email === null ? null : Email.parse(row.email),
    consent: row.consent && {
      grantedAt: date('consent.grantedAt', row.consent.grantedAt),
      termsVersion: row.consent.termsVersion,
      channel: oneOf('consent.channel', row.consent.channel, CONSENT_CHANNELS),
    },
    createdAt: date('createdAt', row.createdAt),
    anonymizedAt: row.anonymizedAt ? date('anonymizedAt', row.anonymizedAt) : null,
  });
}

export function clientToRow(client: Client): ClientRow {
  return {
    id: client.id,
    barbershopId: client.barbershopId,
    name: client.name,
    phone: client.phone?.digits ?? null,
    email: client.email?.value ?? null,
    consent: client.consent && {
      grantedAt: iso(client.consent.grantedAt),
      termsVersion: client.consent.termsVersion,
      channel: client.consent.channel,
    },
    createdAt: iso(client.createdAt),
    anonymizedAt: client.anonymizedAt && iso(client.anonymizedAt),
  };
}

// Appointment

const CHANGE_REQUESTERS: readonly ChangeRequestedBy[] = ['CLIENT', 'STAFF'];

export function appointmentFromRow(row: AppointmentRow): Appointment {
  const { cancellation, serviceRecord } = row;
  return Appointment.restore({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    professionalId: toId(row.professionalId),
    clientId: toId(row.clientId),
    serviceId: toId(row.serviceId),
    range: range(row.start, row.end),
    price: Money.fromCents(row.priceCents),
    status: oneOf('status', row.status, APPOINTMENT_STATUSES),
    createdAt: date('createdAt', row.createdAt),
    cancellation: cancellation && {
      cancelledAt: date('cancelledAt', cancellation.cancelledAt),
      cancelledBy: oneOf('cancelledBy', cancellation.cancelledBy, CHANGE_REQUESTERS),
      reason: cancellation.reason,
      late: cancellation.late,
    },
    serviceRecord: serviceRecord && {
      amountPaid: Money.fromCents(serviceRecord.amountPaidCents),
      paymentMethod: oneOf('paymentMethod', serviceRecord.paymentMethod, PAYMENT_METHODS),
      completedAt: date('completedAt', serviceRecord.completedAt),
    },
  });
}

export function appointmentToRow(appointment: Appointment): AppointmentRow {
  const { cancellation, serviceRecord } = appointment;
  return {
    id: appointment.id,
    barbershopId: appointment.barbershopId,
    professionalId: appointment.professionalId,
    clientId: appointment.clientId,
    serviceId: appointment.serviceId,
    start: iso(appointment.start),
    end: iso(appointment.end),
    priceCents: appointment.price.cents,
    status: appointment.status,
    createdAt: iso(appointment.createdAt),
    cancellation: cancellation && {
      cancelledAt: iso(cancellation.cancelledAt),
      cancelledBy: cancellation.cancelledBy,
      reason: cancellation.reason,
      late: cancellation.late,
    },
    serviceRecord: serviceRecord && {
      amountPaidCents: serviceRecord.amountPaid.cents,
      paymentMethod: serviceRecord.paymentMethod,
      completedAt: iso(serviceRecord.completedAt),
    },
  };
}

// TimeBlock

export function timeBlockFromRow(row: TimeBlockRow): TimeBlock {
  return TimeBlock.create({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    professionalId: toId(row.professionalId),
    range: range(row.start, row.end),
    reason: row.reason,
    createdBy: toId(row.createdBy),
    createdAt: date('createdAt', row.createdAt),
  });
}

export function timeBlockToRow(block: TimeBlock): TimeBlockRow {
  return {
    id: block.id,
    barbershopId: block.barbershopId,
    professionalId: block.professionalId,
    start: iso(block.range.start),
    end: iso(block.range.end),
    reason: block.reason,
    createdBy: block.createdBy,
    createdAt: iso(block.createdAt),
  };
}

// Notification

export function notificationFromRow(row: NotificationRow): Notification {
  return Notification.restore({
    id: toId(row.id),
    barbershopId: toId(row.barbershopId),
    kind: oneOf('notificationKind', row.kind, NOTIFICATION_KINDS),
    appointmentId: toId(row.appointmentId),
    professionalId: toId(row.professionalId),
    clientId: toId(row.clientId),
    serviceId: toId(row.serviceId),
    previousStart: date('previousStart', row.previousStart),
    newStart: row.newStart === null ? null : date('newStart', row.newStart),
    createdAt: date('createdAt', row.createdAt),
    readBy: row.readBy.map((userId) => toId(userId)),
  });
}

export function notificationToRow(notification: Notification): NotificationRow {
  return {
    id: notification.id,
    barbershopId: notification.barbershopId,
    kind: notification.kind,
    appointmentId: notification.appointmentId,
    professionalId: notification.professionalId,
    clientId: notification.clientId,
    serviceId: notification.serviceId,
    previousStart: iso(notification.previousStart),
    newStart: notification.newStart && iso(notification.newStart),
    createdAt: iso(notification.createdAt),
    readBy: [...notification.readBy],
  };
}
