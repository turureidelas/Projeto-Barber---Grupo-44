import type { InMemoryDatabase, RowOf, TableName } from './InMemoryDatabase';

type IdentifiedTable = Exclude<TableName, 'credentials'>;

/** Typed access to one table, converting rows to entities and back through the mappers. */
export class EntityTable<T extends IdentifiedTable, Entity> {
  private readonly db: InMemoryDatabase;
  private readonly table: T;
  private readonly fromRow: (row: RowOf<T>) => Entity;
  private readonly toRow: (entity: Entity) => RowOf<T>;

  constructor(
    db: InMemoryDatabase,
    table: T,
    fromRow: (row: RowOf<T>) => Entity,
    toRow: (entity: Entity) => RowOf<T>,
  ) {
    this.db = db;
    this.table = table;
    this.fromRow = fromRow;
    this.toRow = toRow;
  }

  async findById(id: string): Promise<Entity | null> {
    const rows = await this.db.all(this.table);
    const row = rows.find((candidate) => candidate.id === id);
    return row ? this.fromRow(row) : null;
  }

  async where(predicate: (row: RowOf<T>) => boolean): Promise<Entity[]> {
    const rows = await this.db.all(this.table);
    return rows.filter(predicate).map((row) => this.fromRow(row));
  }

  save(entity: Entity): Promise<void> {
    return this.db.upsert(this.table, this.toRow(entity));
  }

  delete(id: string): Promise<void> {
    return this.db.remove(this.table, id);
  }
}

/** True when the ISO interval [start, end) overlaps [from, to). */
export function overlapsIso(start: string, end: string, from: Date, to: Date): boolean {
  return Date.parse(start) < to.getTime() && from.getTime() < Date.parse(end);
}
