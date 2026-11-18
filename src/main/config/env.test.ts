import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('defaults to mocks when nothing is set', () => {
    expect(parseEnv({})).toEqual({ apiUrl: '', useMocks: true });
  });

  it('reads the API URL and disables mocks', () => {
    expect(
      parseEnv({ VITE_API_URL: 'http://localhost:3333/api', VITE_USE_MOCKS: 'false' }),
    ).toEqual({ apiUrl: 'http://localhost:3333/api', useMocks: false });
  });

  it('requires the API URL when mocks are disabled', () => {
    expect(() => parseEnv({ VITE_USE_MOCKS: 'false' })).toThrow(/VITE_API_URL/);
  });

  it('rejects an invalid value', () => {
    expect(() => parseEnv({ VITE_USE_MOCKS: 'sim' })).toThrow(/VITE_USE_MOCKS/);
  });
});
