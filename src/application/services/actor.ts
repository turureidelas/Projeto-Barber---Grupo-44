import type { ClientId } from '@domain/entities/ids';
import type { User } from '@domain/entities/User';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import type { ApplicationDependencies } from '../dependencies';
import { NotAuthenticatedError } from '../errors';

export type ActorDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock'>;

/**
 * The signed-in user performing the action. Use cases never trust a user passed by the UI:
 * they resolve it from the session.
 */
export async function requireActor(deps: ActorDeps): Promise<User> {
  const session = await deps.auth.getSession();
  if (!session || session.expiresAt.getTime() <= deps.clock.now().getTime()) {
    throw new NotAuthenticatedError();
  }
  const user = await deps.users.findById(session.userId);
  if (!user) {
    throw new NotAuthenticatedError();
  }
  return user;
}

export interface ClientActor {
  readonly user: User;
  readonly clientId: ClientId;
}

/** The signed-in client (client area). Staff accounts are refused. */
export async function requireClientActor(deps: ActorDeps): Promise<ClientActor> {
  const user = await requireActor(deps);
  if (user.clientId === null) {
    throw new PermissionDeniedError('client');
  }
  return { user, clientId: user.clientId };
}
