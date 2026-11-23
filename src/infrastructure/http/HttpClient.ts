import { isKnownErrorCode, NotAuthenticatedError, RemoteError } from '@application/errors';

/**
 * Thin wrapper around fetch for the Na Régua API (VITE_API_URL).
 *
 * - JSON in and out; the session token goes in the Authorization header.
 * - Errors become the same codes the UI already translates: 401 → NOT_AUTHENTICATED,
 *   a body like `{ "code": "SCHEDULE_CONFLICT" }` → that code, anything else → UNEXPECTED.
 * - LGPD: query strings may only carry IDs, dates and limits. Personal data (phone, e-mail,
 *   search text) always goes in a POST body, so it never lands in URLs or server logs.
 */

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly fetch?: FetchFn;
  /** Current session token, or null when signed out. */
  readonly getToken?: () => string | null;
}

export type QueryValue = string | number | undefined;

/** Raised when the request never got an answer (offline, DNS, CORS…). Maps to UNEXPECTED. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Could not reach the API.', { cause });
    this.name = 'NetworkError';
  }
}

/** Unexpected HTTP status without one of our codes. Maps to UNEXPECTED. */
export class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The API answered with status ${String(status)}.`);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;
  private readonly getToken: () => string | null;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.getToken = options.getToken ?? (() => null);
  }

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  /** GET that treats 404 as "doesn't exist" (repositories' findById). */
  getOrNull<T>(path: string): Promise<T | null> {
    return this.request<T | null>('GET', path, { notFoundAsNull: true });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  /** POST lookup that treats 404 as "not found" (e.g. client by phone). */
  postOrNull<T>(path: string, body: unknown): Promise<T | null> {
    return this.request<T | null>('POST', path, { body, notFoundAsNull: true });
  }

  async put(path: string, body: unknown): Promise<void> {
    await this.request<unknown>('PUT', path, { body });
  }

  async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path, {});
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      readonly query?: Record<string, QueryValue> | undefined;
      readonly body?: unknown;
      readonly notFoundAsNull?: boolean;
    },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await this.fetchFn(this.url(path, options.query), {
        method,
        headers,
        ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
      });
    } catch (error) {
      throw new NetworkError(error);
    }

    if (response.ok) {
      if (response.status === NO_CONTENT) return undefined as T;
      const text = await response.text();
      return (text === '' ? undefined : JSON.parse(text)) as T;
    }
    if (response.status === NOT_FOUND && options.notFoundAsNull) {
      return null as T;
    }
    throw await toError(response);
  }

  private url(path: string, query: Record<string, QueryValue> | undefined): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) params.set(key, String(value));
    }
    const search = params.toString();
    return `${this.baseUrl}${path}${search ? `?${search}` : ''}`;
  }
}

async function toError(response: Response): Promise<Error> {
  const body = await readJson(response);
  const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : null;
  if (isKnownErrorCode(code)) {
    return new RemoteError(code, `The API refused the request (${code}).`);
  }
  if (response.status === UNAUTHORIZED) {
    return new NotAuthenticatedError();
  }
  return new HttpStatusError(response.status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return null;
  }
}
