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
import type { TimeRange } from '@domain/value-objects/TimeRange';

/**
 * Persistence ports. All async, so the in-memory mocks can be swapped for the HTTP API
 * without touching use cases. Implementations live in infrastructure/.
 */

export interface RangeQuery {
  readonly barbershopId: BarbershopId;
  /** Returns items overlapping this range. */
  readonly range: TimeRange;
  readonly professionalId?: ProfessionalId;
}

export interface BarbershopRepository {
  findById(id: BarbershopId): Promise<Barbershop | null>;
  save(barbershop: Barbershop): Promise<void>;
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
}

export interface ProfessionalRepository {
  findById(id: ProfessionalId): Promise<Professional | null>;
  listByBarbershop(barbershopId: BarbershopId): Promise<Professional[]>;
  save(professional: Professional): Promise<void>;
}

export interface ServiceRepository {
  findById(id: ServiceId): Promise<Service | null>;
  listByBarbershop(barbershopId: BarbershopId): Promise<Service[]>;
  save(service: Service): Promise<void>;
}

export interface ClientRepository {
  findById(id: ClientId): Promise<Client | null>;
  findByIds(ids: readonly ClientId[]): Promise<Client[]>;
  /** Matches name (ignoring case/accents) or phone digits. */
  search(barbershopId: BarbershopId, query: string, limit: number): Promise<Client[]>;
  save(client: Client): Promise<void>;
}

export interface AppointmentRepository {
  findById(id: AppointmentId): Promise<Appointment | null>;
  /** Appointments of any status overlapping the range. */
  listInRange(query: RangeQuery): Promise<Appointment[]>;
  listByClient(clientId: ClientId): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<void>;
}

export interface TimeBlockRepository {
  findById(id: TimeBlockId): Promise<TimeBlock | null>;
  listInRange(query: RangeQuery): Promise<TimeBlock[]>;
  save(timeBlock: TimeBlock): Promise<void>;
  delete(id: TimeBlockId): Promise<void>;
}
