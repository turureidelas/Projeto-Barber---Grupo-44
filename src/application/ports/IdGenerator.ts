/** Generates unique IDs for new entities (UUIDs in production). */
export interface IdGenerator {
  next(): string;
}
