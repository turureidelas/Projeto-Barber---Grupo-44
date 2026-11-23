import { Client } from '@domain/entities/Client';
import { toId, type ClientId } from '@domain/entities/ids';
import type { User } from '@domain/entities/User';
import { InvalidValueError } from '@domain/errors/DomainError';
import { assertPermission } from '@domain/services/access-control';
import { summarizeClientHistory } from '@domain/services/client-history';
import { Email } from '@domain/value-objects/Email';
import { Phone } from '@domain/value-objects/Phone';
import type { ApplicationDependencies } from '../../dependencies';
import type { ClientDetailsDTO, ClientSummaryDTO } from '../../dto/catalog';
import { AlreadyExistsError } from '../../errors';
import { requireActor } from '../../services/actor';
import { assembleAppointments, toClientSummaryDTO } from '../../services/assemblers';
import { requireBarbershop, requireClient } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/** Version of the privacy terms the client agrees to when registered at the counter. */
export const CURRENT_TERMS_VERSION = '2026.1';

/** LGPD data minimization: name and phone are required, e-mail is optional. */
export interface ClientInput {
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
}

type Deps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'ids' | 'clients'>;

async function requireManager(deps: Deps): Promise<User> {
  const actor = await requireActor(deps);
  assertPermission(actor, 'clients:manage');
  return actor;
}

function parseEmail(email: string | null): Email | null {
  return email === null || email.trim() === '' ? null : Email.parse(email);
}

async function assertPhoneIsFree(
  deps: Deps,
  actor: User,
  phone: Phone,
  ownerId: ClientId | null,
): Promise<void> {
  const existing = await deps.clients.findByPhone(actor.barbershopId, phone);
  if (existing && existing.id !== ownerId) {
    throw new AlreadyExistsError('phone');
  }
}

export interface CreateClientInput extends ClientInput {
  /** The client agreed to have their data stored (LGPD). Required to register. */
  readonly consentGiven: boolean;
}

export class CreateClient implements UseCase<CreateClientInput, ClientSummaryDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: CreateClientInput): Promise<ClientSummaryDTO> {
    const actor = await requireManager(this.deps);
    if (!input.consentGiven) {
      throw new InvalidValueError('consent', 'the client must agree before being registered');
    }
    const phone = Phone.parse(input.phone);
    await assertPhoneIsFree(this.deps, actor, phone, null);

    const now = this.deps.clock.now();
    const client = Client.create({
      id: toId<ClientId>(this.deps.ids.next()),
      barbershopId: actor.barbershopId,
      name: input.name,
      phone,
      email: parseEmail(input.email),
      consent: { grantedAt: now, termsVersion: CURRENT_TERMS_VERSION, channel: 'PANEL' },
      createdAt: now,
    });
    await this.deps.clients.save(client);
    return toClientSummaryDTO(client);
  }
}

export interface UpdateClientInput extends ClientInput {
  readonly clientId: string;
}

export class UpdateClient implements UseCase<UpdateClientInput, ClientSummaryDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: UpdateClientInput): Promise<ClientSummaryDTO> {
    const actor = await requireManager(this.deps);
    const current = await requireClient(this.deps, actor, input.clientId);
    const phone = Phone.parse(input.phone);
    await assertPhoneIsFree(this.deps, actor, phone, current.id);

    const updated = current.update({ name: input.name, phone, email: parseEmail(input.email) });
    await this.deps.clients.save(updated);
    return toClientSummaryDTO(updated);
  }
}

type DetailsDeps = Pick<
  ApplicationDependencies,
  | 'auth'
  | 'users'
  | 'clock'
  | 'barbershops'
  | 'professionals'
  | 'services'
  | 'clients'
  | 'appointments'
>;

/** Contact, consent, numbers (visits, no-shows, return frequency) and full history. */
export class GetClientDetails implements UseCase<{ clientId: string }, ClientDetailsDTO> {
  private readonly deps: DetailsDeps;

  constructor(deps: DetailsDeps) {
    this.deps = deps;
  }

  async execute(input: { clientId: string }): Promise<ClientDetailsDTO> {
    const actor = await requireActor(this.deps);
    assertPermission(actor, 'clients:manage');
    const client = await requireClient(this.deps, actor, input.clientId);
    const barbershop = await requireBarbershop(this.deps, actor);
    const appointments = await this.deps.appointments.listByClient(client.id);
    const summary = summarizeClientHistory(appointments);
    const history = await assembleAppointments(this.deps, barbershop, appointments);

    return {
      id: client.id,
      name: client.name,
      phone: client.phone.formatted(),
      email: client.email?.value ?? null,
      consent: client.consent && {
        grantedAt: client.consent.grantedAt.toISOString(),
        termsVersion: client.consent.termsVersion,
        channel: client.consent.channel,
      },
      createdAt: client.createdAt.toISOString(),
      stats: {
        visits: summary.visits,
        noShows: summary.noShows,
        cancellations: summary.cancellations,
        lastVisit: summary.lastVisit?.toISOString() ?? null,
        averageDaysBetweenVisits: summary.averageDaysBetweenVisits,
        totalSpentCents: summary.totalSpent.cents,
      },
      history: history.reverse(),
    };
  }
}
