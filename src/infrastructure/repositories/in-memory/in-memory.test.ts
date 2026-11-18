import { toId } from '@domain/entities/ids';
import { at } from '@domain/testing/builders';
import { InMemoryAuthGateway } from '@infrastructure/auth/InMemoryAuthGateway';
import { MemoryStorage } from '@infrastructure/storage/KeyValueStorage';
import { describe, expect, it } from 'vitest';
import { emptySnapshot, InMemoryDatabase } from './InMemoryDatabase';
import { InMemoryTimeBlockRepository } from './in-memory-repositories';
import { createDemoSeed } from './seed/demo-seed';

const KEY = InMemoryDatabase.DEFAULT_STORAGE_KEY;

describe('InMemoryDatabase', () => {
  it('persists every write and reloads it', async () => {
    const storage = new MemoryStorage();
    const db = new InMemoryDatabase({ storage });
    expect(db.isEmpty()).toBe(true);

    db.replaceAll(createDemoSeed(at('10:00')));
    const blocks = new InMemoryTimeBlockRepository(db);
    await blocks.delete(toId('block-001'));

    const reloaded = new InMemoryDatabase({ storage });
    expect(reloaded.isEmpty()).toBe(false);
    const ids = (await reloaded.all('timeBlocks')).map((row) => row.id);
    expect(ids).toEqual(['block-002', 'block-003']);
  });

  it.each([
    ['corrupted JSON', '{oops'],
    ['an older schema version', JSON.stringify({ ...emptySnapshot(), version: 0 })],
    ['a missing table', JSON.stringify({ version: 1, users: [] })],
  ])('starts empty when storage holds %s', (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, raw);
    expect(new InMemoryDatabase({ storage }).isEmpty()).toBe(true);
  });

  it('works without storage and returns copies of its tables', async () => {
    const db = new InMemoryDatabase({ storage: null });
    db.replaceAll(createDemoSeed(at('10:00')));
    const users = await db.all('users');
    (users as unknown[]).length = 0;
    expect(await db.all('users')).toHaveLength(4);
  });

  it('simulates latency when asked to', async () => {
    const db = new InMemoryDatabase({ storage: null, latencyMs: 20 });
    const started = performance.now();
    await db.all('users');
    expect(performance.now() - started).toBeGreaterThanOrEqual(15);
  });
});

describe('InMemoryAuthGateway', () => {
  it.each([
    ['garbage', 'not json'],
    ['a session without user', JSON.stringify({ expiresAt: '2026-11-18T23:00:00Z' })],
    ['an invalid expiry', JSON.stringify({ userId: 'user-1', expiresAt: 'never' })],
  ])('ignores %s in storage', async (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem('na-regua:session', raw);
    const gateway = new InMemoryAuthGateway(new InMemoryDatabase({ storage: null }), storage, {
      now: () => at('10:00'),
    });
    await expect(gateway.getSession()).resolves.toBeNull();
  });
});
