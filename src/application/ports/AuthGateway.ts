import type { UserId } from '@domain/entities/ids';
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
}
