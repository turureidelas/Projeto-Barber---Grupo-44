/** Minimal subset of the Web Storage API, so tests can use an in-memory map. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements KeyValueStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

/**
 * window.localStorage when usable; otherwise (private mode, blocked storage, tests)
 * an in-memory fallback, so the app still works — it just forgets on reload.
 */
export function createBrowserStorage(): KeyValueStorage {
  try {
    const storage = globalThis.localStorage;
    const probe = '__na-regua-probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return new MemoryStorage();
  }
}
