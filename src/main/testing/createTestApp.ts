import type { SessionUserDTO } from '@application/dto/catalog';
import type { Clock } from '@application/ports/Clock';
import type { IdGenerator } from '@application/ports/IdGenerator';
import { Barbershop } from '@domain/entities/Barbershop';
import { Client } from '@domain/entities/Client';
import { toId, type ClientId, type ServiceId, type UserId } from '@domain/entities/ids';
import { Professional } from '@domain/entities/Professional';
import { Service } from '@domain/entities/Service';
import { User, type Role } from '@domain/entities/User';
import { aWeekSchedule, at, ids, minutes, reais } from '@domain/testing/builders';
import { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import { Email } from '@domain/value-objects/Email';
import { Percentage } from '@domain/value-objects/Percentage';
import { Phone } from '@domain/value-objects/Phone';
import * as map from '@infrastructure/mappers/mappers';
import {
  emptySnapshot,
  InMemoryDatabase,
} from '@infrastructure/repositories/in-memory/InMemoryDatabase';
import { createDemoSeed } from '@infrastructure/repositories/in-memory/seed/demo-seed';
import { MemoryStorage } from '@infrastructure/storage/KeyValueStorage';
import { createContainer, type Container } from '../container';

/**
 * A complete app (real use cases + in-memory adapters) on a small, explicit fixture:
 * Barbearia Nova Era with Ricardo (owner, cuts hair) and Bruno (barber), receptionist Camila,
 * two clients and three services. Clock starts on Wednesday 2026-11-18 08:00 (São Paulo).
 */

export const PASSWORD = 'secret';

export const fixture = {
  shop: ids.shop,
  ricardo: ids.ricardo,
  bruno: ids.bruno,
  joao: ids.client,
  maria: toId<ClientId>('client-maria'),
  haircut: ids.haircut,
  combo: ids.combo,
  inactiveService: toId<ServiceId>('svc-inactive'),
  users: {
    owner: { id: toId<UserId>('user-ricardo'), email: 'ricardo@novaera.demo' },
    barber: { id: toId<UserId>('user-bruno'), email: 'bruno@novaera.demo' },
    receptionist: { id: toId<UserId>('user-camila'), email: 'camila@novaera.demo' },
  },
} as const;

export type Persona = keyof typeof fixture.users;

export class FixedClock implements Clock {
  private current: Date;

  constructor(now: Date) {
    this.current = now;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(now: Date): void {
    this.current = now;
  }
}

export class SequentialIds implements IdGenerator {
  private count = 0;

  next(): string {
    this.count += 1;
    return `new-${String(this.count)}`;
  }
}

export interface TestApp extends Container {
  readonly clock: FixedClock;
  readonly storage: MemoryStorage;
  signInAs(persona: Persona): Promise<SessionUserDTO>;
}

export interface TestAppOptions {
  readonly now?: Date;
  /** 'fixture' (default): small explicit data set. 'demo': the full Barbearia Nova Era seed. */
  readonly dataset?: 'fixture' | 'demo';
}

export function createTestApp(options: TestAppOptions | Date = {}): TestApp {
  const { now = at('08:00'), dataset = 'fixture' } =
    options instanceof Date ? { now: options } : options;
  const storage = new MemoryStorage();
  new InMemoryDatabase({ storage }).replaceAll(
    dataset === 'demo' ? createDemoSeed(now) : buildFixture(),
  );

  const clock = new FixedClock(now);
  const container = createContainer({
    env: { apiUrl: '', useMocks: true },
    storage,
    clock,
    ids: new SequentialIds(),
    seedDemoData: false,
  });

  return {
    ...container,
    clock,
    storage,
    signInAs: (persona) =>
      container.useCases.auth.signIn.execute({
        email: fixture.users[persona].email,
        password: PASSWORD,
      }),
  };
}

function buildFixture() {
  const shop = Barbershop.create({
    id: fixture.shop,
    name: 'Barbearia Nova Era',
    phone: Phone.parse('1134567890'),
    address: null,
    cancellationPolicy: CancellationPolicy.default(),
  });

  const professional = (id: typeof ids.ricardo, name: string, commission: number) =>
    Professional.create({
      id,
      barbershopId: fixture.shop,
      name,
      specialty: null,
      photoUrl: null,
      commission: Percentage.of(commission),
      schedule: aWeekSchedule(),
      active: true,
    });

  const user = (
    persona: Persona,
    name: string,
    role: Role,
    professionalId: typeof ids.ricardo | null,
  ) =>
    User.create({
      id: fixture.users[persona].id,
      barbershopId: fixture.shop,
      name,
      email: Email.parse(fixture.users[persona].email),
      role,
      professionalId,
    });

  const haircut = Service.createSingle({
    id: fixture.haircut,
    barbershopId: fixture.shop,
    name: 'Corte',
    duration: minutes(30),
    price: reais(45),
  });
  const beard = Service.createSingle({
    id: ids.beard,
    barbershopId: fixture.shop,
    name: 'Barba',
    duration: minutes(30),
    price: reais(35),
  });
  const combo = Service.createCombo({
    id: fixture.combo,
    barbershopId: fixture.shop,
    name: 'Corte + Barba',
    duration: minutes(60),
    price: reais(70),
    items: [haircut, beard],
  });
  const inactive = Service.createSingle({
    id: fixture.inactiveService,
    barbershopId: fixture.shop,
    name: 'Luzes',
    duration: minutes(90),
    price: reais(120),
  }).deactivate();

  const client = (id: ClientId, name: string, phone: string, email: string | null) =>
    Client.create({
      id,
      barbershopId: fixture.shop,
      name,
      phone: Phone.parse(phone),
      email: email === null ? null : Email.parse(email),
      consent: null,
      createdAt: at('08:00', '2026-01-10'),
    });

  const users = [
    user('owner', 'Ricardo Almeida', 'OWNER', fixture.ricardo),
    user('barber', 'Bruno Santos', 'PROFESSIONAL', fixture.bruno),
    user('receptionist', 'Camila Rocha', 'RECEPTIONIST', null),
  ];

  return {
    ...emptySnapshot(),
    barbershops: [map.barbershopToRow(shop)],
    users: users.map(map.userToRow),
    credentials: users.map((u) => ({ userId: u.id, password: PASSWORD })),
    professionals: [
      professional(fixture.ricardo, 'Ricardo Almeida', 100),
      professional(fixture.bruno, 'Bruno Santos', 40),
    ].map(map.professionalToRow),
    services: [haircut, beard, combo, inactive].map(map.serviceToRow),
    clients: [
      client(fixture.joao, 'João Pedro', '(11) 98765-4321', 'joao@email.demo'),
      client(fixture.maria, 'Maria Antônia', '(11) 91234-5678', null),
    ].map(map.clientToRow),
  };
}
