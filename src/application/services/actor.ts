import type { User } from '@domain/entities/User';
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
