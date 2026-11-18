import { InvalidValueError } from '@domain/errors/DomainError';
import { Email } from '@domain/value-objects/Email';
import type { ApplicationDependencies } from '../../dependencies';
import type { SessionUserDTO } from '../../dto/catalog';
import { InvalidCredentialsError, NotAuthenticatedError } from '../../errors';
import { requireActor } from '../../services/actor';
import { toSessionUserDTO } from '../../services/assemblers';
import type { UseCase } from '../UseCase';

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

type SignInDeps = Pick<ApplicationDependencies, 'auth' | 'users'>;

export class SignIn implements UseCase<SignInInput, SessionUserDTO> {
  private readonly deps: SignInDeps;

  constructor(deps: SignInDeps) {
    this.deps = deps;
  }

  async execute(input: SignInInput): Promise<SessionUserDTO> {
    const session = await this.deps.auth.signIn(parseEmail(input.email), input.password);
    const user = await this.deps.users.findById(session.userId);
    if (!user) {
      await this.deps.auth.signOut();
      throw new InvalidCredentialsError();
    }
    return toSessionUserDTO(user);
  }
}

/** A malformed e-mail gets the same generic answer as a wrong password. */
function parseEmail(value: string): Email {
  try {
    return Email.parse(value);
  } catch (error) {
    if (error instanceof InvalidValueError) throw new InvalidCredentialsError();
    throw error;
  }
}

type SignOutDeps = Pick<ApplicationDependencies, 'auth'>;

export class SignOut implements UseCase<void, void> {
  private readonly deps: SignOutDeps;

  constructor(deps: SignOutDeps) {
    this.deps = deps;
  }

  execute(): Promise<void> {
    return this.deps.auth.signOut();
  }
}

type CurrentUserDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock'>;

/** The signed-in user, or null when there is no valid session. */
export class GetCurrentUser implements UseCase<void, SessionUserDTO | null> {
  private readonly deps: CurrentUserDeps;

  constructor(deps: CurrentUserDeps) {
    this.deps = deps;
  }

  async execute(): Promise<SessionUserDTO | null> {
    try {
      return toSessionUserDTO(await requireActor(this.deps));
    } catch (error) {
      if (error instanceof NotAuthenticatedError) return null;
      throw error;
    }
  }
}
