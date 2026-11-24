import type { FetchFn } from '@infrastructure/http/HttpClient';
import type { DatabaseSnapshot } from '@infrastructure/repositories/in-memory/InMemoryDatabase';

/**
 * A tiny stand-in for the future Na Régua API, used only by tests: it serves the same rows
 * the mock stores, on the routes the HTTP adapters call. It does not re-check business rules
 * (the real API must) — it only lets us run the real use cases through the HTTP layer.
 */

type Row = { id: string } & Record<string, unknown>;
type TableName = Exclude<keyof DatabaseSnapshot, 'version' | 'credentials'>;

const SEGMENT_TABLES: Readonly<Record<string, TableName>> = {
  barbershops: 'barbershops',
  users: 'users',
  professionals: 'professionals',
  services: 'services',
  clients: 'clients',
  appointments: 'appointments',
  'time-blocks': 'timeBlocks',
  notifications: 'notifications',
};

export interface FakeApi {
  readonly fetch: FetchFn;
  /** Every URL requested, to check that no personal data travels in it. */
  readonly urls: string[];
  /** Next request to this path answers with this error body and status. */
  failNext(path: string, status: number, body: unknown): void;
}

export function createFakeApi(snapshot: DatabaseSnapshot, now: () => Date): FakeApi {
  const data = structuredClone(snapshot);
  const table = (name: TableName) => data[name] as unknown as Row[];
  const urls: string[] = [];
  const failures = new Map<string, { status: number; body: unknown }>();
  const tokens = new Set<string>();

  const reply = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), { status });

  const handle = (method: string, url: URL, body: unknown, token: string | null): Response => {
    const failure = failures.get(url.pathname);
    if (failure) {
      failures.delete(url.pathname);
      return reply(failure.status, failure.body);
    }
    const parts = url.pathname.replace(/^\/api\//, '').split('/');
    const input = (body ?? {}) as Record<string, unknown>;

    const openSession = (userId: string) => {
      const issued = `token-${userId}`;
      tokens.add(issued);
      const expiresAt = new Date(now().getTime() + 12 * 3_600_000).toISOString();
      return reply(201, { userId, expiresAt, token: issued });
    };

    if (parts[0] === 'auth') {
      if (method === 'POST' && parts[1] === 'client-accounts') {
        const account = input as { client: Row; user: Row; password: string };
        table('clients').push(account.client);
        table('users').push(account.user);
        data.credentials.push({ userId: account.user.id, password: account.password });
        return openSession(account.user.id);
      }
      if (method === 'POST') {
        const user = table('users').find((row) => row.email === input.email);
        const valid = data.credentials.some(
          (row) => row.userId === user?.id && row.password === input.password,
        );
        if (!user || !valid) return reply(401, { code: 'INVALID_CREDENTIALS' });
        return openSession(user.id);
      }
      if (token) tokens.delete(token);
      return reply(204);
    }
    // Public: barbershops where a client can sign up.
    if (method === 'GET' && parts.length === 1 && parts[0] === 'barbershops') {
      return reply(200, table('barbershops'));
    }
    if (!token || !tokens.has(token)) return reply(401);

    const [first = '', second, third, fourth] = parts;
    const name = SEGMENT_TABLES[first];
    if (!name) return reply(404);

    // /barbershops/:id/<table>[/search|/lookup]
    if (first === 'barbershops' && third) {
      const nested = SEGMENT_TABLES[third];
      if (!nested) return reply(404);
      const rows = table(nested).filter((row) => row.barbershopId === second);
      if (fourth === 'lookup') {
        const found = rows.find((row) => row.phone === input.phone);
        return found ? reply(200, found) : reply(404, { code: 'NOT_FOUND' });
      }
      if (fourth === 'search') {
        const text = String(input.query).toLowerCase();
        const matches = rows
          .filter((row) => row.phone !== null && String(row.name).toLowerCase().includes(text))
          .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
        return reply(200, matches.slice(0, Number(input.limit)));
      }
      return reply(200, filterByQuery(rows, url.searchParams));
    }
    // /clients/:id/appointments
    if (first === 'clients' && third === 'appointments') {
      return reply(
        200,
        table('appointments').filter((row) => row.clientId === second),
      );
    }
    if (first === 'clients' && second === 'batch') {
      const wanted = new Set(input.ids as string[]);
      return reply(
        200,
        table('clients').filter((row) => wanted.has(row.id)),
      );
    }
    if (first === 'users' && second === 'lookup') {
      const found = table('users').find((row) => row.email === input.email);
      return found ? reply(200, found) : reply(404);
    }

    const rows = table(name);
    const index = rows.findIndex((row) => row.id === second);
    if (method === 'GET') return index === -1 ? reply(404) : reply(200, rows[index]);
    if (method === 'PUT') {
      if (index === -1) rows.push(input as Row);
      else rows[index] = input as Row;
      return reply(204);
    }
    if (method === 'DELETE') {
      if (index !== -1) rows.splice(index, 1);
      return reply(204);
    }
    return reply(405);
  };

  const fetch: FetchFn = (input, init) => {
    urls.push(input);
    const url = new URL(input);
    const headers = (init.headers ?? {}) as Record<string, string>;
    const token = headers.Authorization?.replace(/^Bearer /, '') ?? null;
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    return Promise.resolve(handle(init.method ?? 'GET', url, body, token));
  };

  return {
    fetch,
    urls,
    failNext: (path, status, body) => {
      failures.set(path, { status, body });
    },
  };
}

/** ?from&to (overlapping instants), ?professionalId and ?limit (newest first). */
function filterByQuery(rows: Row[], params: URLSearchParams): Row[] {
  const from = params.get('from');
  const to = params.get('to');
  const professionalId = params.get('professionalId');
  const limit = params.get('limit');
  let result = rows.filter(
    (row) =>
      (professionalId === null || row.professionalId === professionalId) &&
      (from === null ||
        to === null ||
        (Date.parse(String(row.start)) < Date.parse(to) &&
          Date.parse(from) < Date.parse(String(row.end)))),
  );
  if (limit !== null) {
    result = [...result]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, Number(limit));
  }
  return result;
}
