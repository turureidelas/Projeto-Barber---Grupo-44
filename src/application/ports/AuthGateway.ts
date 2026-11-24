import type { Client } from '@domain/entities/Client';
import type { UserId } from '@domain/entities/ids';
import type { User } from '@domain/entities/User';
import type { Email } from '@domain/value-objects/Email';

/** Only the user ID is kept in the session — no personal data (LGPD). */
export interface Session {
  readonly userId: UserId;
  readonly expiresAt: Date;
}

export interface AuthGateway {
  /** @throws InvalidCredentialsError */
  signIn(email: Email, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  /**
   * Client self sign-up: stores the client record, its account and password together, then
   * opens the session. Uniqueness and rules are checked by the use case before calling it.
   */
  signUpClient(account: NewClientAccount): Promise<Session>;
}

export interface NewClientAccount {
  readonly client: Client;
  readonly user: User;
  readonly password: string;
}
