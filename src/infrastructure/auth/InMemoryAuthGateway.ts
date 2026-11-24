import type { AuthGateway, NewClientAccount, Session } from '@application/ports/AuthGateway';
import type { Clock } from '@application/ports/Clock';
import { InvalidCredentialsError } from '@application/errors';
import { toId } from '@domain/entities/ids';
import type { Email } from '@domain/value-objects/Email';
import * as map from '../mappers/mappers';
import type { InMemoryDatabase } from '../repositories/in-memory/InMemoryDatabase';
import type { KeyValueStorage } from '../storage/KeyValueStorage';

const SESSION_KEY = 'na-regua:session';
const SESSION_HOURS = 12;
const MS_PER_HOUR = 3_600_000;

interface StoredSession {
  userId: string;
  expiresAt: string;
}

/**
 * Mock authentication for demo mode. Passwords are compared in plain text — acceptable only
 * because these are fake demo accounts. The session keeps just the user ID (no personal data).
 */
export class InMemoryAuthGateway implements AuthGateway {
  private readonly db: InMemoryDatabase;
  private readonly storage: KeyValueStorage;
  private readonly clock: Clock;

  constructor(db: InMemoryDatabase, storage: KeyValueStorage, clock: Clock) {
    this.db = db;
    this.storage = storage;
    this.clock = clock;
  }

  async signIn(email: Email, password: string): Promise<Session> {
    const users = await this.db.all('users');
    const credentials = await this.db.all('credentials');
    const user = users.find((row) => row.email === email.value);
    const valid = credentials.some((row) => row.userId === user?.id && row.password === password);
    if (!user || !valid) {
      throw new InvalidCredentialsError();
    }

    return this.openSession(user.id);
  }

  async signUpClient({ client, user, password }: NewClientAccount): Promise<Session> {
    await this.db.upsert('clients', map.clientToRow(client));
    await this.db.upsert('users', map.userToRow(user));
    await this.db.addCredential({ userId: user.id, password });
    return this.openSession(user.id);
  }

  private openSession(userId: string): Session {
    const session: Session = {
      userId: toId(userId),
      expiresAt: new Date(this.clock.now().getTime() + SESSION_HOURS * MS_PER_HOUR),
    };
    const stored: StoredSession = { userId, expiresAt: session.expiresAt.toISOString() };
    this.storage.setItem(SESSION_KEY, JSON.stringify(stored));
    return session;
  }

  signOut(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
    return Promise.resolve();
  }

  getSession(): Promise<Session | null> {
    return Promise.resolve(this.readSession());
  }

  private readSession(): Session | null {
    const raw = this.storage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const stored = JSON.parse(raw) as Partial<StoredSession>;
      const expiresAt = new Date(stored.expiresAt ?? '');
      if (typeof stored.userId !== 'string' || Number.isNaN(expiresAt.getTime())) return null;
      return { userId: toId(stored.userId), expiresAt };
    } catch {
      return null;
    }
  }
}
