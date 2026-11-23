import { Appointment, type PaymentMethod } from '@domain/entities/Appointment';
import { Barbershop } from '@domain/entities/Barbershop';
import { Client } from '@domain/entities/Client';
import { toId, type BarbershopId } from '@domain/entities/ids';
import { Professional } from '@domain/entities/Professional';
import { Service } from '@domain/entities/Service';
import { TimeBlock } from '@domain/entities/TimeBlock';
import { User } from '@domain/entities/User';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import { Duration } from '@domain/value-objects/Duration';
import { Email } from '@domain/value-objects/Email';
import { LocalDate, WEEKDAYS } from '@domain/value-objects/LocalDate';
import { Money } from '@domain/value-objects/Money';
import { Percentage } from '@domain/value-objects/Percentage';
import { Phone } from '@domain/value-objects/Phone';
import { TimeOfDay } from '@domain/value-objects/TimeOfDay';
import { TimeRange } from '@domain/value-objects/TimeRange';
import { TimeWindow } from '@domain/value-objects/TimeWindow';
import { WorkSchedule, type WorkScheduleInput } from '@domain/value-objects/WorkSchedule';
import * as map from '../../../mappers/mappers';
import { emptySnapshot, type DatabaseSnapshot } from '../InMemoryDatabase';
import {
  DEMO_ACCOUNTS,
  DEMO_CLIENT_NAMES,
  DEMO_PASSWORD,
  DEMO_PROFESSIONALS,
  DEMO_SERVICES,
  SHOP_ID,
  type DemoProfessional,
} from './demo-catalog';
import { SeededRandom } from './random';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const SLOT_MINUTES = 15;
const DAYS_BEFORE = 21;
const DAYS_AFTER = 10;
const RANDOM_SEED = 20_261_118;
const OWNER_ID = 'user-ricardo';

const PAYMENT_WEIGHTS: readonly (readonly [PaymentMethod, number])[] = [
  ['PIX', 45],
  ['CREDIT_CARD', 20],
  ['DEBIT_CARD', 20],
  ['CASH', 15],
];

/**
 * Builds the demo database relative to `now`: three weeks of history (mostly completed, some
 * no-shows and cancellations), today in progress, and ten days of upcoming bookings.
 * Deterministic for a given day, and every booking is validated by the AvailabilityService.
 */
export function createDemoSeed(now: Date): DatabaseSnapshot {
  const random = new SeededRandom(RANDOM_SEED);
  const policy = CancellationPolicy.default();
  const today = LocalDate.fromInstant(now);
  const shopId = toId<BarbershopId>(SHOP_ID);

  const barbershop = Barbershop.create({
    id: shopId,
    name: 'Barbearia Nova Era',
    phone: Phone.parse('(11) 3456-7890'),
    address: 'Rua das Palmeiras, 120 — Vila Mariana, São Paulo/SP',
    cancellationPolicy: policy,
  });

  const professionals = DEMO_PROFESSIONALS.map((pro) =>
    Professional.create({
      id: toId(pro.id),
      barbershopId: shopId,
      name: pro.name,
      specialty: pro.specialty,
      photoUrl: null,
      commission: Percentage.of(pro.commissionPercent),
      schedule: scheduleOf(pro),
      active: true,
    }),
  );

  const users = DEMO_ACCOUNTS.map((account) =>
    User.create({
      id: toId(account.userId),
      barbershopId: shopId,
      name: account.name,
      email: Email.parse(account.email),
      role: account.role,
      professionalId: account.professionalId === null ? null : toId(account.professionalId),
    }),
  );

  const services = createServices(shopId);
  const clients = createClients(random, shopId, now);
  const timeBlocks = createTimeBlocks(today, now);

  const availability = new AvailabilityService();
  const serviceWeights = DEMO_SERVICES.map((demo) => {
    const service = services.find((candidate) => candidate.id === demo.id);
    if (!service) throw new Error(`Unknown demo service ${demo.id}`);
    return [service, demo.weight] as const;
  });

  const appointments: Appointment[] = [];
  const pickClient = createClientPicker(random, clients);
  let sequence = 0;

  for (let offset = -DAYS_BEFORE; offset <= DAYS_AFTER; offset++) {
    const date = today.addDays(offset);
    const occupancy = occupancyFor(offset, date.weekday === 6);

    for (const professional of professionals) {
      const booked: Appointment[] = [];
      const agenda = {
        professionalId: professional.id,
        schedule: professional.schedule,
        appointments: booked,
        timeBlocks: timeBlocks.filter((block) => block.professionalId === professional.id),
      };

      for (const window of professional.schedule.workingWindowsOn(date.weekday)) {
        let minute = window.start.minutesSinceMidnight;
        while (minute < window.end.minutesSinceMidnight) {
          if (!random.chance(occupancy)) {
            minute += SLOT_MINUTES * random.int(1, 2);
            continue;
          }
          const service = random.weighted(serviceWeights);
          const slot = TimeRange.startingAt(
            date.at(TimeOfDay.fromMinutes(minute)),
            service.duration,
          );
          // Past dates are fine here: we are rebuilding history, not booking now.
          const free = availability.checkSlot(agenda, slot, { now: new Date(0) }).available;
          if (!free) {
            minute += SLOT_MINUTES;
            continue;
          }

          sequence += 1;
          const appointment = withRealisticStatus(
            Appointment.schedule({
              id: toId(`appt-${String(sequence).padStart(4, '0')}`),
              barbershopId: shopId,
              professionalId: professional.id,
              clientId: pickClient(slot.start).id,
              serviceId: service.id,
              start: slot.start,
              duration: service.duration,
              price: service.price,
              createdAt: bookingTime(random, slot.start, now),
            }),
            { random, now, policy, offset },
          );
          booked.push(appointment);
          appointments.push(appointment);
          minute = roundUpToSlot(minute + service.duration.minutes);
        }
      }
    }
  }

  return {
    ...emptySnapshot(),
    barbershops: [map.barbershopToRow(barbershop)],
    users: users.map(map.userToRow),
    credentials: users.map((user) => ({ userId: user.id, password: DEMO_PASSWORD })),
    professionals: professionals.map(map.professionalToRow),
    services: services.map(map.serviceToRow),
    clients: clients.map(map.clientToRow),
    appointments: appointments.map(map.appointmentToRow),
    timeBlocks: timeBlocks.map(map.timeBlockToRow),
  };
}

function scheduleOf(pro: DemoProfessional): WorkSchedule {
  const input: WorkScheduleInput = {};
  for (const weekday of WEEKDAYS) {
    const shift = pro.shifts[weekday];
    if (!shift) continue;
    const [open, close, breaks = []] = shift;
    input[weekday] = {
      hours: TimeWindow.parse(open, close),
      breaks: breaks.map(([start, end]) => TimeWindow.parse(start, end)),
    };
  }
  return WorkSchedule.create(input);
}

function createServices(shopId: BarbershopId): Service[] {
  const singles = DEMO_SERVICES.filter((demo) => !demo.comboOf).map((demo) =>
    Service.createSingle({
      id: toId(demo.id),
      barbershopId: shopId,
      name: demo.name,
      duration: Duration.ofMinutes(demo.durationMinutes),
      price: Money.fromCents(demo.priceCents),
    }),
  );
  const combos = DEMO_SERVICES.flatMap((demo) =>
    demo.comboOf
      ? [
          Service.createCombo({
            id: toId(demo.id),
            barbershopId: shopId,
            name: demo.name,
            duration: Duration.ofMinutes(demo.durationMinutes),
            price: Money.fromCents(demo.priceCents),
            items: singles.filter((single) => demo.comboOf?.includes(single.id)),
          }),
        ]
      : [],
  );
  return [...singles, ...combos];
}

function createClients(random: SeededRandom, shopId: string, now: Date): Client[] {
  return DEMO_CLIENT_NAMES.map((name, index) => {
    const createdAt = new Date(now.getTime() - random.int(30, 400) * DAY);
    const slug = name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .split(' ')
      .slice(0, 2)
      .join('.');
    return Client.create({
      id: toId(`client-${String(index + 1).padStart(3, '0')}`),
      barbershopId: toId(shopId),
      name,
      phone: Phone.parse(
        `11 9${String(random.int(6, 9))}${String(random.int(100, 999))}-${String(random.int(1000, 9999))}`,
      ),
      email: random.chance(0.4) ? Email.parse(`${slug}@email.demo`) : null,
      consent: random.chance(0.85)
        ? {
            grantedAt: createdAt,
            termsVersion: '2026.1',
            channel: random.chance(0.6) ? 'APP' : 'PANEL',
          }
        : null,
      createdAt,
    });
  });
}

function createTimeBlocks(today: LocalDate, now: Date): TimeBlock[] {
  const block = (
    id: string,
    professionalId: string,
    offset: number,
    from: string,
    to: string,
    reason: string,
  ) => {
    const date = today.addDays(offset);
    return TimeBlock.create({
      id: toId(id),
      barbershopId: toId(SHOP_ID),
      professionalId: toId(professionalId),
      range: TimeRange.create(date.at(TimeOfDay.parse(from)), date.at(TimeOfDay.parse(to))),
      reason,
      createdBy: toId(OWNER_ID),
      createdAt: new Date(now.getTime() - 2 * DAY),
    });
  };
  return [
    block('block-001', 'pro-ricardo', 0, '17:30', '19:00', 'Buscar o filho na escola'),
    block('block-002', 'pro-bruno', 1, '15:00', '17:00', 'Consulta médica'),
    block('block-003', 'pro-diego', 3, '09:00', '12:00', 'Curso de barboterapia'),
  ];
}

/** Busier in the past and today, thinner further ahead; Saturdays are fuller. */
function occupancyFor(offset: number, isSaturday: boolean): number {
  const base = offset < 0 ? 0.72 : offset === 0 ? 0.78 : Math.max(0.15, 0.7 - offset * 0.06);
  return Math.min(0.92, base + (isSaturday ? 0.12 : 0));
}

/** Booked between a few hours and six days in advance, and never in the future. */
function bookingTime(random: SeededRandom, start: Date, now: Date): Date {
  const lead = random.int(0, 6) * DAY + random.int(1, 10) * HOUR;
  return new Date(Math.min(start.getTime() - lead, now.getTime() - 30 * MINUTE));
}

interface StatusContext {
  readonly random: SeededRandom;
  readonly now: Date;
  readonly policy: CancellationPolicy;
  readonly offset: number;
}

function withRealisticStatus(appointment: Appointment, context: StatusContext): Appointment {
  const { random, now, policy } = context;
  const start = appointment.start.getTime();
  const end = appointment.end.getTime();
  const deadline = policy.changeDeadline(appointment.start).getTime();
  const created = appointment.createdAt.getTime();
  const roll = random.next();

  if (end <= now.getTime()) {
    if (roll < 0.07) {
      return appointment.markNoShow(new Date(start + 20 * MINUTE), policy);
    }
    if (roll < 0.15) {
      return created < deadline
        ? appointment.cancel({
            by: 'CLIENT',
            reason: null,
            now: new Date(created + (deadline - created) * random.next()),
            policy,
          })
        : appointment.cancel({
            by: 'STAFF',
            reason: 'Cliente avisou pelo WhatsApp que não viria',
            now: new Date(Math.min(start - 15 * MINUTE, now.getTime())),
            policy,
          });
    }
    const tip = random.chance(0.08) ? 500 : 0;
    return appointment.markArrived().complete({
      amountPaid: Money.fromCents(appointment.price.cents + tip),
      paymentMethod: random.weighted(PAYMENT_WEIGHTS),
      now: new Date(end + random.int(0, 5) * MINUTE),
    });
  }

  if (start <= now.getTime()) {
    return appointment.markArrived();
  }

  if (roll < 0.05 && now.getTime() < deadline) {
    return appointment.cancel({ by: 'CLIENT', reason: null, now, policy });
  }
  return context.offset <= 1 && roll < 0.65 ? appointment.confirm() : appointment;
}

const MIN_DAYS_BETWEEN_VISITS = 10;
const PICK_ATTEMPTS = 8;

/**
 * Picks a client for a booking, preferring someone who hasn't been in for a while — so clients
 * come back every couple of weeks, like in real life, instead of on random consecutive days.
 */
function createClientPicker(random: SeededRandom, clients: readonly Client[]) {
  const pool = asNonEmpty(clients);
  const lastBooking = new Map<string, number>();
  return (start: Date): Client => {
    let candidate = random.pick(pool);
    for (let attempt = 1; attempt < PICK_ATTEMPTS; attempt++) {
      const last = lastBooking.get(candidate.id);
      if (last === undefined || start.getTime() - last >= MIN_DAYS_BETWEEN_VISITS * DAY) break;
      candidate = random.pick(pool);
    }
    lastBooking.set(candidate.id, start.getTime());
    return candidate;
  };
}

function roundUpToSlot(minute: number): number {
  return Math.ceil(minute / SLOT_MINUTES) * SLOT_MINUTES;
}

function asNonEmpty<T>(items: readonly T[]): readonly [T, ...T[]] {
  if (items.length === 0) throw new Error('Expected at least one item');
  return items as readonly [T, ...T[]];
}
