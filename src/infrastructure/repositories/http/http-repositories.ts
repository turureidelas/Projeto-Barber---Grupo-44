import type {
  AppointmentRepository,
  BarbershopRepository,
  ClientRepository,
  NotificationRepository,
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
  NotificationId,
  ProfessionalId,
  ServiceId,
  TimeBlockId,
  UserId,
} from '@domain/entities/ids';
import type { Notification } from '@domain/entities/Notification';
import type { Professional } from '@domain/entities/Professional';
import type { Service } from '@domain/entities/Service';
import type { TimeBlock } from '@domain/entities/TimeBlock';
import type { User } from '@domain/entities/User';
import type { Email } from '@domain/value-objects/Email';
import type { Phone } from '@domain/value-objects/Phone';
import type { HttpClient, QueryValue } from '../../http/HttpClient';
import * as map from '../../mappers/mappers';
import type {
  AppointmentRow,
  BarbershopRow,
  ClientRow,
  NotificationRow,
  ProfessionalRow,
  ServiceRow,
  TimeBlockRow,
  UserRow,
} from '../../mappers/rows';

/**
 * Persistence ports over the Na Régua API. The payloads are the same rows the mock stores,
 * converted by the shared mappers — so use cases and screens don't change.
 *
 * The API must still enforce permissions and business rules on its side: these adapters
 * only move data, they never decide anything.
 */

const id = encodeURIComponent;

async function one<Row, Entity>(
  request: Promise<Row | null>,
  fromRow: (row: Row) => Entity,
): Promise<Entity | null> {
  const row = await request;
  return row === null ? null : fromRow(row);
}

async function many<Row, Entity>(
  request: Promise<Row[]>,
  fromRow: (row: Row) => Entity,
): Promise<Entity[]> {
  return (await request).map(fromRow);
}

/** Only IDs and instants: never personal data in the query string. */
function rangeQuery({ range, professionalId }: RangeQuery): Record<string, QueryValue> {
  return {
    from: range.start.toISOString(),
    to: range.end.toISOString(),
    professionalId,
  };
}

export class HttpBarbershopRepository implements BarbershopRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(barbershopId: BarbershopId): Promise<Barbershop | null> {
    return one(
      this.http.getOrNull<BarbershopRow>(`/barbershops/${id(barbershopId)}`),
      map.barbershopFromRow,
    );
  }

  /** Public route: the client area lists barbershops before signing in. */
  listAll(): Promise<Barbershop[]> {
    return many(this.http.get<BarbershopRow[]>('/barbershops'), map.barbershopFromRow);
  }

  save(barbershop: Barbershop): Promise<void> {
    return this.http.put(`/barbershops/${id(barbershop.id)}`, map.barbershopToRow(barbershop));
  }
}

export class HttpUserRepository implements UserRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(userId: UserId): Promise<User | null> {
    return one(this.http.getOrNull<UserRow>(`/users/${id(userId)}`), map.userFromRow);
  }

  findByEmail(email: Email): Promise<User | null> {
    return one(
      this.http.postOrNull<UserRow>('/users/lookup', { email: email.value }),
      map.userFromRow,
    );
  }
}

export class HttpProfessionalRepository implements ProfessionalRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(professionalId: ProfessionalId): Promise<Professional | null> {
    return one(
      this.http.getOrNull<ProfessionalRow>(`/professionals/${id(professionalId)}`),
      map.professionalFromRow,
    );
  }

  listByBarbershop(barbershopId: BarbershopId): Promise<Professional[]> {
    return many(
      this.http.get<ProfessionalRow[]>(`/barbershops/${id(barbershopId)}/professionals`),
      map.professionalFromRow,
    );
  }

  save(professional: Professional): Promise<void> {
    return this.http.put(
      `/professionals/${id(professional.id)}`,
      map.professionalToRow(professional),
    );
  }
}

export class HttpServiceRepository implements ServiceRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(serviceId: ServiceId): Promise<Service | null> {
    return one(this.http.getOrNull<ServiceRow>(`/services/${id(serviceId)}`), map.serviceFromRow);
  }

  listByBarbershop(barbershopId: BarbershopId): Promise<Service[]> {
    return many(
      this.http.get<ServiceRow[]>(`/barbershops/${id(barbershopId)}/services`),
      map.serviceFromRow,
    );
  }

  save(service: Service): Promise<void> {
    return this.http.put(`/services/${id(service.id)}`, map.serviceToRow(service));
  }
}

export class HttpClientRepository implements ClientRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(clientId: ClientId): Promise<Client | null> {
    return one(this.http.getOrNull<ClientRow>(`/clients/${id(clientId)}`), map.clientFromRow);
  }

  findByIds(ids: readonly ClientId[]): Promise<Client[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return many(this.http.post<ClientRow[]>('/clients/batch', { ids }), map.clientFromRow);
  }

  findByPhone(barbershopId: BarbershopId, phone: Phone): Promise<Client | null> {
    return one(
      this.http.postOrNull<ClientRow>(`/barbershops/${id(barbershopId)}/clients/lookup`, {
        phone: phone.digits,
      }),
      map.clientFromRow,
    );
  }

  search(barbershopId: BarbershopId, query: string, limit: number): Promise<Client[]> {
    return many(
      this.http.post<ClientRow[]>(`/barbershops/${id(barbershopId)}/clients/search`, {
        query,
        limit,
      }),
      map.clientFromRow,
    );
  }

  save(client: Client): Promise<void> {
    return this.http.put(`/clients/${id(client.id)}`, map.clientToRow(client));
  }
}

export class HttpAppointmentRepository implements AppointmentRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(appointmentId: AppointmentId): Promise<Appointment | null> {
    return one(
      this.http.getOrNull<AppointmentRow>(`/appointments/${id(appointmentId)}`),
      map.appointmentFromRow,
    );
  }

  listInRange(query: RangeQuery): Promise<Appointment[]> {
    return many(
      this.http.get<AppointmentRow[]>(
        `/barbershops/${id(query.barbershopId)}/appointments`,
        rangeQuery(query),
      ),
      map.appointmentFromRow,
    );
  }

  listByClient(clientId: ClientId): Promise<Appointment[]> {
    return many(
      this.http.get<AppointmentRow[]>(`/clients/${id(clientId)}/appointments`),
      map.appointmentFromRow,
    );
  }

  save(appointment: Appointment): Promise<void> {
    return this.http.put(`/appointments/${id(appointment.id)}`, map.appointmentToRow(appointment));
  }
}

export class HttpTimeBlockRepository implements TimeBlockRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(timeBlockId: TimeBlockId): Promise<TimeBlock | null> {
    return one(
      this.http.getOrNull<TimeBlockRow>(`/time-blocks/${id(timeBlockId)}`),
      map.timeBlockFromRow,
    );
  }

  listInRange(query: RangeQuery): Promise<TimeBlock[]> {
    return many(
      this.http.get<TimeBlockRow[]>(
        `/barbershops/${id(query.barbershopId)}/time-blocks`,
        rangeQuery(query),
      ),
      map.timeBlockFromRow,
    );
  }

  save(timeBlock: TimeBlock): Promise<void> {
    return this.http.put(`/time-blocks/${id(timeBlock.id)}`, map.timeBlockToRow(timeBlock));
  }

  delete(timeBlockId: TimeBlockId): Promise<void> {
    return this.http.delete(`/time-blocks/${id(timeBlockId)}`);
  }
}

export class HttpNotificationRepository implements NotificationRepository {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  findById(notificationId: NotificationId): Promise<Notification | null> {
    return one(
      this.http.getOrNull<NotificationRow>(`/notifications/${id(notificationId)}`),
      map.notificationFromRow,
    );
  }

  listRecent(barbershopId: BarbershopId, limit: number): Promise<Notification[]> {
    return many(
      this.http.get<NotificationRow[]>(`/barbershops/${id(barbershopId)}/notifications`, {
        limit,
      }),
      map.notificationFromRow,
    );
  }

  save(notification: Notification): Promise<void> {
    return this.http.put(
      `/notifications/${id(notification.id)}`,
      map.notificationToRow(notification),
    );
  }
}
