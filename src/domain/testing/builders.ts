/**
 * Test data builders shared by domain and application tests.
 * Reference day: Wednesday 2026-11-18, Barbearia Nova Era.
 */
import { Appointment, type ScheduleAppointmentInput } from '../entities/Appointment';
import {
  toId,
  type AppointmentId,
  type BarbershopId,
  type ClientId,
  type ProfessionalId,
  type ServiceId,
  type TimeBlockId,
  type UserId,
} from '../entities/ids';
import { Service } from '../entities/Service';
import { TimeBlock } from '../entities/TimeBlock';
import { CancellationPolicy } from '../value-objects/CancellationPolicy';
import { Duration } from '../value-objects/Duration';
import { Money } from '../value-objects/Money';
import { TimeRange } from '../value-objects/TimeRange';
import { TimeWindow } from '../value-objects/TimeWindow';
import { WorkSchedule } from '../value-objects/WorkSchedule';

export const TODAY = '2026-11-18';

/** Instant for a São Paulo wall-clock time: at('09:30') or at('09:30', '2026-11-19'). */
export function at(time: string, date: string = TODAY): Date {
  return new Date(`${date}T${time}:00-03:00`);
}

export const ids = {
  shop: toId<BarbershopId>('shop-nova-era'),
  ricardo: toId<ProfessionalId>('pro-ricardo'),
  bruno: toId<ProfessionalId>('pro-bruno'),
  client: toId<ClientId>('client-joao'),
  haircut: toId<ServiceId>('svc-haircut'),
  beard: toId<ServiceId>('svc-beard'),
  combo: toId<ServiceId>('svc-combo'),
  owner: toId<UserId>('user-ricardo'),
};

/** Mon–Fri 09:00–19:00 with lunch 12:00–13:00; Sat 09:00–14:00; Sun off. */
export function aWeekSchedule(): WorkSchedule {
  const weekday = {
    hours: TimeWindow.parse('09:00', '19:00'),
    breaks: [TimeWindow.parse('12:00', '13:00')],
  };
  return WorkSchedule.create({
    1: weekday,
    2: weekday,
    3: weekday,
    4: weekday,
    5: weekday,
    6: { hours: TimeWindow.parse('09:00', '14:00'), breaks: [] },
  });
}

export const minutes = (value: number): Duration => Duration.ofMinutes(value);
export const reais = (value: number): Money => Money.fromCents(Math.round(value * 100));

let sequence = 0;
const nextId = (prefix: string): string => `${prefix}-${String(++sequence)}`;

export function anAppointment(overrides: Partial<ScheduleAppointmentInput> = {}): Appointment {
  return Appointment.schedule({
    id: toId<AppointmentId>(nextId('appt')),
    barbershopId: ids.shop,
    professionalId: ids.ricardo,
    clientId: ids.client,
    serviceId: ids.haircut,
    start: at('10:00'),
    duration: minutes(30),
    price: reais(45),
    createdAt: at('08:00'),
    ...overrides,
  });
}

export function aTimeBlock(
  start: Date,
  end: Date,
  professionalId: ProfessionalId = ids.ricardo,
): TimeBlock {
  return TimeBlock.create({
    id: toId<TimeBlockId>(nextId('block')),
    barbershopId: ids.shop,
    professionalId,
    range: TimeRange.create(start, end),
    reason: null,
    createdBy: ids.owner,
    createdAt: at('08:00'),
  });
}

export function aSingleService(id: ServiceId = ids.haircut, name = 'Corte'): Service {
  return Service.createSingle({
    id,
    barbershopId: ids.shop,
    name,
    duration: minutes(30),
    price: reais(45),
  });
}

export function aPolicy(minNoticeHours = 2, noShowToleranceMinutes = 15): CancellationPolicy {
  return CancellationPolicy.create({ minNoticeHours, noShowToleranceMinutes });
}
