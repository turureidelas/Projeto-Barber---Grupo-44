import type { Clock } from '@application/ports/Clock';
import type { IdGenerator } from '@application/ports/IdGenerator';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
