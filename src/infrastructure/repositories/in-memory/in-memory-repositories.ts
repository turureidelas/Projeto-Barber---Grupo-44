import type {
  AppointmentRepository,
  BarbershopRepository,
  ClientRepository,
  ProfessionalRepository,
  RangeQuery,
  ServiceRepository,
  TimeBlockRepository,
  UserRepository,
} from '@application/ports/repositories';
import type { Appointment } from '@domain/entities/Appointment';
import type { Barbershop } from '@domain/entities/Barbershop';
import type { Client } from '@domain/entities/Client';
import type {
  AppointmentId,
  BarbershopId,
  ClientId,
  ProfessionalId,
  ServiceId,
  TimeBlockId,
  UserId,
} from '@domain/entities/ids';
import type { Professional } from '@domain/entities/Professional';
import type { Service } from '@domain/entities/Service';
import type { TimeBlock } from '@domain/entities/TimeBlock';
import type { User } from '@domain/entities/User';
import type { Email } from '@domain/value-objects/Email';
import type { Phone } from '@domain/value-objects/Phone';
import { normalizeForSearch } from '@shared/text';
import * as map from '../../mappers/mappers';
import { EntityTable, overlapsIso } from './EntityTable';
import type { InMemoryDatabase } from './InMemoryDatabase';

/** In-memory implementations of the persistence ports (demo mode). */

export class InMemoryBarbershopRepository implements BarbershopRepository {
  private readonly table: EntityTable<'barbershops', Barbershop>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'barbershops', map.barbershopFromRow, map.barbershopToRow);
  }

  findById(id: BarbershopId): Promise<Barbershop | null> {
    return this.table.findById(id);
  }

  save(barbershop: Barbershop): Promise<void> {
    return this.table.save(barbershop);
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly table: EntityTable<'users', User>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'users', map.userFromRow, map.userToRow);
  }

  findById(id: UserId): Promise<User | null> {
    return this.table.findById(id);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const [user] = await this.table.where((row) => row.email === email.value);
    return user ?? null;
  }
}

export class InMemoryProfessionalRepository implements ProfessionalRepository {
  private readonly table: EntityTable<'professionals', Professional>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(
      db,
      'professionals',
      map.professionalFromRow,
      map.professionalToRow,
    );
  }

  findById(id: ProfessionalId): Promise<Professional | null> {
    return this.table.findById(id);
  }

  listByBarbershop(barbershopId: BarbershopId): Promise<Professional[]> {
    return this.table.where((row) => row.barbershopId === barbershopId);
  }

  save(professional: Professional): Promise<void> {
    return this.table.save(professional);
  }
}

export class InMemoryServiceRepository implements ServiceRepository {
  private readonly table: EntityTable<'services', Service>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'services', map.serviceFromRow, map.serviceToRow);
  }

  findById(id: ServiceId): Promise<Service | null> {
    return this.table.findById(id);
  }

  listByBarbershop(barbershopId: BarbershopId): Promise<Service[]> {
    return this.table.where((row) => row.barbershopId === barbershopId);
  }

  save(service: Service): Promise<void> {
    return this.table.save(service);
  }
}

export class InMemoryClientRepository implements ClientRepository {
  private readonly table: EntityTable<'clients', Client>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'clients', map.clientFromRow, map.clientToRow);
  }

  findById(id: ClientId): Promise<Client | null> {
    return this.table.findById(id);
  }

  findByIds(ids: readonly ClientId[]): Promise<Client[]> {
    const wanted = new Set<string>(ids);
    return this.table.where((row) => wanted.has(row.id));
  }

  async findByPhone(barbershopId: BarbershopId, phone: Phone): Promise<Client | null> {
    const [client] = await this.table.where(
      (row) => row.barbershopId === barbershopId && row.phone === phone.digits,
    );
    return client ?? null;
  }

  async search(barbershopId: BarbershopId, query: string, limit: number): Promise<Client[]> {
    const text = normalizeForSearch(query);
    const digits = query.replace(/\D/g, '');
    const matches = await this.table.where(
      (row) =>
        row.barbershopId === barbershopId &&
        (normalizeForSearch(row.name).includes(text) ||
          (digits.length >= 3 && row.phone.includes(digits))),
    );
    return matches.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).slice(0, limit);
  }

  save(client: Client): Promise<void> {
    return this.table.save(client);
  }
}

export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly table: EntityTable<'appointments', Appointment>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'appointments', map.appointmentFromRow, map.appointmentToRow);
  }

  findById(id: AppointmentId): Promise<Appointment | null> {
    return this.table.findById(id);
  }

  listInRange({ barbershopId, range, professionalId }: RangeQuery): Promise<Appointment[]> {
    return this.table.where(
      (row) =>
        row.barbershopId === barbershopId &&
        (professionalId === undefined || row.professionalId === professionalId) &&
        overlapsIso(row.start, row.end, range.start, range.end),
    );
  }

  listByClient(clientId: ClientId): Promise<Appointment[]> {
    return this.table.where((row) => row.clientId === clientId);
  }

  save(appointment: Appointment): Promise<void> {
    return this.table.save(appointment);
  }
}

export class InMemoryTimeBlockRepository implements TimeBlockRepository {
  private readonly table: EntityTable<'timeBlocks', TimeBlock>;

  constructor(db: InMemoryDatabase) {
    this.table = new EntityTable(db, 'timeBlocks', map.timeBlockFromRow, map.timeBlockToRow);
  }

  findById(id: TimeBlockId): Promise<TimeBlock | null> {
    return this.table.findById(id);
  }

  listInRange({ barbershopId, range, professionalId }: RangeQuery): Promise<TimeBlock[]> {
    return this.table.where(
      (row) =>
        row.barbershopId === barbershopId &&
        (professionalId === undefined || row.professionalId === professionalId) &&
        overlapsIso(row.start, row.end, range.start, range.end),
    );
  }

  save(timeBlock: TimeBlock): Promise<void> {
    return this.table.save(timeBlock);
  }

  delete(id: TimeBlockId): Promise<void> {
    return this.table.delete(id);
  }
}
