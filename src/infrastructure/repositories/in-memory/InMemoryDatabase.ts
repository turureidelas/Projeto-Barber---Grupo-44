import type {
  AppointmentRow,
  BarbershopRow,
  ClientRow,
  ProfessionalRow,
  ServiceRow,
  TimeBlockRow,
  UserRow,
} from '../../mappers/rows';
import type { KeyValueStorage } from '../../storage/KeyValueStorage';

/** Demo-only credentials (mock auth). Never used against the real API. */
export interface CredentialRow {
  userId: string;
  password: string;
}

export interface DatabaseSnapshot {
  version: typeof SCHEMA_VERSION;
  barbershops: BarbershopRow[];
  users: UserRow[];
  credentials: CredentialRow[];
  professionals: ProfessionalRow[];
  services: ServiceRow[];
  clients: ClientRow[];
  appointments: AppointmentRow[];
  timeBlocks: TimeBlockRow[];
}

export type TableName = Exclude<keyof DatabaseSnapshot, 'version'>;
export type RowOf<T extends TableName> = DatabaseSnapshot[T][number];

const SCHEMA_VERSION = 1;
const TABLES: readonly TableName[] = [
  'barbershops',
  'users',
  'credentials',
  'professionals',
  'services',
  'clients',
  'appointments',
  'timeBlocks',
];

export function emptySnapshot(): DatabaseSnapshot {
  return {
    version: SCHEMA_VERSION,
    barbershops: [],
    users: [],
    credentials: [],
    professionals: [],
    services: [],
    clients: [],
    appointments: [],
    timeBlocks: [],
  };
}

export interface InMemoryDatabaseOptions {
  /** Where to persist between reloads; null keeps everything in memory only. */
  readonly storage: KeyValueStorage | null;
  readonly storageKey?: string;
  /** Artificial delay per operation, so loading states show up like with a real API. */
  readonly latencyMs?: number;
}

/**
 * Tiny JSON "database" behind the in-memory repositories.
 * Stores rows (not entities) so it can be serialized to localStorage as-is.
 */
export class InMemoryDatabase {
  static readonly DEFAULT_STORAGE_KEY = `na-regua:demo-db:v${String(SCHEMA_VERSION)}`;

  private snapshot: DatabaseSnapshot;
  private readonly storage: KeyValueStorage | null;
  private readonly storageKey: string;
  private readonly latencyMs: number;

  constructor(options: InMemoryDatabaseOptions) {
    this.storage = options.storage;
    this.storageKey = options.storageKey ?? InMemoryDatabase.DEFAULT_STORAGE_KEY;
    this.latencyMs = options.latencyMs ?? 0;
    this.snapshot = this.load();
  }

  isEmpty(): boolean {
    return this.snapshot.barbershops.length === 0;
  }

  replaceAll(snapshot: DatabaseSnapshot): void {
    this.snapshot = structuredClone(snapshot);
    this.persist();
  }

  async all<T extends TableName>(table: T): Promise<readonly RowOf<T>[]> {
    await this.simulateLatency();
    return [...this.snapshot[table]];
  }

  async upsert<T extends TableName>(table: T, row: RowOf<T> & { id: string }): Promise<void> {
    await this.simulateLatency();
    const rows = this.snapshot[table] as (RowOf<T> & { id: string })[];
    const index = rows.findIndex((existing) => existing.id === row.id);
    if (index === -1) {
      rows.push(row);
    } else {
      rows[index] = row;
    }
    this.persist();
  }

  async remove(table: Exclude<TableName, 'credentials'>, id: string): Promise<void> {
    await this.simulateLatency();
    const rows: { id: string }[] = this.snapshot[table];
    const index = rows.findIndex((existing) => existing.id === id);
    if (index !== -1) {
      rows.splice(index, 1);
      this.persist();
    }
  }

  private load(): DatabaseSnapshot {
    const raw = this.storage?.getItem(this.storageKey);
    if (!raw) return emptySnapshot();
    try {
      const parsed = JSON.parse(raw) as Partial<DatabaseSnapshot>;
      const valid =
        parsed.version === SCHEMA_VERSION && TABLES.every((table) => Array.isArray(parsed[table]));
      return valid ? (parsed as DatabaseSnapshot) : emptySnapshot();
    } catch {
      return emptySnapshot();
    }
  }

  private persist(): void {
    this.storage?.setItem(this.storageKey, JSON.stringify(this.snapshot));
  }

  private simulateLatency(): Promise<void> {
    if (this.latencyMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
