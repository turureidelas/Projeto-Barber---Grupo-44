import { errorCodeOf, NotAuthenticatedError, RemoteError } from '@application/errors';
import { describe, expect, it } from 'vitest';
import { HttpClient, HttpStatusError, NetworkError, type FetchFn } from './HttpClient';

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

function fakeFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetch: FetchFn = (url, init) => {
    const call = { url, init };
    calls.push(call);
    return Promise.resolve(respond(call));
  };
  return { fetch, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('HttpClient', () => {
  it('sends JSON with the session token and builds clean URLs', async () => {
    const { fetch, calls } = fakeFetch(() => json({ ok: true }));
    let token: string | null = 'abc';
    const http = new HttpClient({ baseUrl: 'https://api.test/v1/', fetch, getToken: () => token });

    await expect(
      http.get('/appointments', { from: '2026-11-18', limit: 5, professionalId: undefined }),
    ).resolves.toEqual({ ok: true });
    await http.post('/clients/search', { query: 'joão' });
    token = null;
    await http.put('/clients/1', { name: 'João' });

    expect(calls.map((call) => [call.init.method, call.url])).toEqual([
      ['GET', 'https://api.test/v1/appointments?from=2026-11-18&limit=5'],
      ['POST', 'https://api.test/v1/clients/search'],
      ['PUT', 'https://api.test/v1/clients/1'],
    ]);
    expect(calls[0]?.init.headers).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer abc',
    });
    expect(calls[1]?.init).toMatchObject({
      body: JSON.stringify({ query: 'joão' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(calls[2]?.init.headers).not.toHaveProperty('Authorization');
  });

  it('handles empty answers and "not found" lookups', async () => {
    const { fetch } = fakeFetch(({ url }) => {
      if (url.endsWith('/empty')) return new Response('', { status: 200 });
      if (url.endsWith('/gone')) return new Response(null, { status: 204 });
      return json({ code: 'NOT_FOUND' }, 404);
    });
    const http = new HttpClient({ baseUrl: 'https://api.test', fetch });

    await expect(http.get('/empty')).resolves.toBeUndefined();
    await expect(http.delete('/gone')).resolves.toBeUndefined();
    await expect(http.getOrNull('/clients/x')).resolves.toBeNull();
    await expect(http.postOrNull('/clients/lookup', { phone: '1' })).resolves.toBeNull();
    // Outside a lookup, 404 is an error with its code.
    await expect(http.get('/clients/x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('turns API failures into the codes the UI already translates', async () => {
    const answers: Record<string, () => Response> = {
      '/conflict': () => json({ code: 'SCHEDULE_CONFLICT', message: 'busy' }, 409),
      '/expired': () => json({ code: 'NOT_AUTHENTICATED' }, 401),
      '/no-token': () => new Response('', { status: 401 }),
      '/odd-code': () => json({ code: 'SOMETHING_ELSE' }, 422),
      '/crash': () => new Response('<html>oops</html>', { status: 500 }),
    };
    const { fetch } = fakeFetch(({ url }) => {
      const answer = answers[new URL(url).pathname];
      return answer ? answer() : new Response('', { status: 500 });
    });
    const http = new HttpClient({ baseUrl: 'https://api.test', fetch });
    const codeOf = (path: string) =>
      http.get(path).then(
        () => 'resolved',
        (error: unknown) => errorCodeOf(error),
      );

    await expect(http.get('/conflict')).rejects.toBeInstanceOf(RemoteError);
    expect(await codeOf('/conflict')).toBe('SCHEDULE_CONFLICT');
    expect(await codeOf('/expired')).toBe('NOT_AUTHENTICATED');
    await expect(http.get('/no-token')).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(await codeOf('/odd-code')).toBe('UNEXPECTED');
    await expect(http.get('/crash')).rejects.toMatchObject({ status: 500 });
    await expect(http.get('/crash')).rejects.toBeInstanceOf(HttpStatusError);
  });

  it('reports a network failure as unexpected', async () => {
    const http = new HttpClient({
      baseUrl: 'https://api.test',
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    const failure = http.get('/anything');
    await expect(failure).rejects.toBeInstanceOf(NetworkError);
    expect(errorCodeOf(await failure.catch((error: unknown) => error))).toBe('UNEXPECTED');
  });
});
