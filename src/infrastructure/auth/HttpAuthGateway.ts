import type { AuthGateway, NewClientAccount, Session } from '@application/ports/AuthGateway';
import { errorCodeOf, InvalidCredentialsError } from '@application/errors';
import { toId } from '@domain/entities/ids';
import type { Email } from '@domain/value-objects/Email';
import type { HttpClient } from '../http/HttpClient';
import * as map from '../mappers/mappers';
import type { KeyValueStorage } from '../storage/KeyValueStorage';

const SESSION_KEY = 'na-regua:session';

/** What the API answers to POST /auth/sessions. */
export interface SessionResponse {
  readonly userId: string;
  readonly expiresAt: string;
  readonly token: string;
}

interface StoredSession {
  userId: string;
  expiresAt: string;
  token: string;
}

/**
 * Sign-in against the API. The browser keeps only the user ID, the expiry and the opaque
 * token (no name, e-mail or phone — LGPD).
 */
export class HttpAuthGateway implements AuthGateway {
  private readonly storage: KeyValueStorage;
  private http: HttpClient | null = null;

  constructor(storage: KeyValueStorage) {
    this.storage = storage;
  }

  /** The client is created after the gateway, because it needs `token()`. */
  connect(http: HttpClient): void {
    this.http = http;
  }

  /** Current token for the Authorization header. */
  token(): string | null {
    return this.read()?.token ?? null;
  }

  async signIn(email: Email, password: string): Promise<Session> {
    let response: SessionResponse;
    try {
      response = await this.client().post<SessionResponse>('/auth/sessions', {
        email: email.value,
        password,
      });
    } catch (error) {
      // Wrong e-mail or password: the same generic message as the mock.
      const code = errorCodeOf(error);
      if (code === 'NOT_AUTHENTICATED' || code === 'INVALID_CREDENTIALS') {
        throw new InvalidCredentialsError();
      }
      throw error;
    }
    return this.store(response);
  }

  /** Public route: creates the client record, the account and the password in one request. */
  async signUpClient({ client, user, password }: NewClientAccount): Promise<Session> {
    const response = await this.client().post<SessionResponse>('/auth/client-accounts', {
      client: map.clientToRow(client),
      user: map.userToRow(user),
      password,
    });
    return this.store(response);
  }

  private store(response: SessionResponse): Session {
    const stored: StoredSession = {
      userId: response.userId,
      expiresAt: response.expiresAt,
      token: response.token,
    };
    this.storage.setItem(SESSION_KEY, JSON.stringify(stored));
    return toSession(stored);
  }

  async signOut(): Promise<void> {
    const hadSession = this.read() !== null;
    this.storage.removeItem(SESSION_KEY);
    if (!hadSession) return;
    try {
      await this.client().delete('/auth/sessions/current');
    } catch {
      // Already signed out locally; the token expires on the server anyway.
    }
  }

  getSession(): Promise<Session | null> {
    const stored = this.read();
    return Promise.resolve(stored && toSession(stored));
  }

  private client(): HttpClient {
    if (!this.http) throw new Error('HttpAuthGateway.connect() was not called.');
    return this.http;
  }

  private read(): StoredSession | null {
    const raw = this.storage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const stored = JSON.parse(raw) as Partial<StoredSession>;
      const valid =
        typeof stored.userId === 'string' &&
        typeof stored.token === 'string' &&
        !Number.isNaN(new Date(stored.expiresAt ?? '').getTime());
      return valid ? (stored as StoredSession) : null;
    } catch {
      return null;
    }
  }
}

function toSession(stored: StoredSession): Session {
  return { userId: toId(stored.userId), expiresAt: new Date(stored.expiresAt) };
}
