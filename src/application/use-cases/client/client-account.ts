import { Client } from '@domain/entities/Client';
import { toId, type BarbershopId, type ClientId, type UserId } from '@domain/entities/ids';
import { User } from '@domain/entities/User';
import { InvalidValueError } from '@domain/errors/DomainError';
import { Email } from '@domain/value-objects/Email';
import { Phone } from '@domain/value-objects/Phone';
import type { ApplicationDependencies } from '../../dependencies';
import type { BarbershopDTO, SessionUserDTO } from '../../dto/catalog';
import type { ClientProfileDTO } from '../../dto/client-area';
import { AlreadyExistsError, NotFoundError } from '../../errors';
import { requireClientActor } from '../../services/actor';
import { toBarbershopDTO, toSessionUserDTO } from '../../services/assemblers';
import { requireClient } from '../../services/lookups';
import { CURRENT_TERMS_VERSION } from '../catalog/client-management';
import type { UseCase } from '../UseCase';

/** Shortest password accepted when a client creates an account. */
export const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72;

type BarbershopsDeps = Pick<ApplicationDependencies, 'barbershops'>;

/** Public (no session): barbershops where a client can create an account. */
export class ListBarbershops implements UseCase<void, BarbershopDTO[]> {
  private readonly deps: BarbershopsDeps;

  constructor(deps: BarbershopsDeps) {
    this.deps = deps;
  }

  async execute(): Promise<BarbershopDTO[]> {
    const barbershops = await this.deps.barbershops.listAll();
    return barbershops.map(toBarbershopDTO).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}

export interface SignUpClientInput {
  readonly barbershopId: string;
  readonly name: string;
  readonly phone: string;
  /** Used to sign in. */
  readonly email: string;
  readonly password: string;
  /** The client agreed to the privacy terms (LGPD). Required. */
  readonly consentGiven: boolean;
}

type SignUpDeps = Pick<
  ApplicationDependencies,
  'auth' | 'users' | 'clock' | 'ids' | 'barbershops' | 'clients'
>;

/**
 * "Criar conta": the client registers themselves (consent through the app) and is signed in.
 * A phone already registered at the barbershop is refused (ALREADY_EXISTS) — linking an
 * existing record needs a confirmation code, which comes with the real API.
 */
export class SignUpClient implements UseCase<SignUpClientInput, SessionUserDTO> {
  private readonly deps: SignUpDeps;

  constructor(deps: SignUpDeps) {
    this.deps = deps;
  }

  async execute(input: SignUpClientInput): Promise<SessionUserDTO> {
    if (!input.consentGiven) {
      throw new InvalidValueError('consent', 'the client must agree to the privacy terms');
    }
    assertPassword(input.password);
    const barbershopId = toId<BarbershopId>(input.barbershopId);
    if (!(await this.deps.barbershops.findById(barbershopId))) {
      throw new NotFoundError('barbershop', input.barbershopId);
    }
    const phone = Phone.parse(input.phone);
    const email = Email.parse(input.email);
    if (await this.deps.clients.findByPhone(barbershopId, phone)) {
      throw new AlreadyExistsError('phone');
    }
    if (await this.deps.users.findByEmail(email)) {
      throw new AlreadyExistsError('email');
    }

    const now = this.deps.clock.now();
    const client = Client.create({
      id: toId<ClientId>(this.deps.ids.next()),
      barbershopId,
      name: input.name,
      phone,
      email,
      consent: { grantedAt: now, termsVersion: CURRENT_TERMS_VERSION, channel: 'APP' },
      createdAt: now,
    });
    const user = User.create({
      id: toId<UserId>(this.deps.ids.next()),
      barbershopId,
      name: client.name,
      email,
      role: 'CLIENT',
      professionalId: null,
      clientId: client.id,
    });
    await this.deps.auth.signUpClient({ client, user, password: input.password });
    return toSessionUserDTO(user);
  }
}

function assertPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new InvalidValueError(
      'password',
      `must have ${String(MIN_PASSWORD_LENGTH)} to ${String(MAX_PASSWORD_LENGTH)} characters`,
    );
  }
}

type ProfileDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'clients'>;

/** "Minha conta": the client's own data and consent. */
export class GetMyProfile implements UseCase<void, ClientProfileDTO> {
  private readonly deps: ProfileDeps;

  constructor(deps: ProfileDeps) {
    this.deps = deps;
  }

  async execute(): Promise<ClientProfileDTO> {
    const { user, clientId } = await requireClientActor(this.deps);
    const client = await requireClient(this.deps, user, clientId);
    return {
      name: client.name,
      phone: client.phone?.formatted() ?? null,
      email: client.email?.value ?? null,
      consent: client.consent && {
        grantedAt: client.consent.grantedAt.toISOString(),
        termsVersion: client.consent.termsVersion,
        channel: client.consent.channel,
      },
      createdAt: client.createdAt.toISOString(),
    };
  }
}
