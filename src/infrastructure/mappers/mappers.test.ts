import { createDemoSeed } from '@infrastructure/repositories/in-memory/seed/demo-seed';
import { InvalidValueError } from '@domain/errors/DomainError';
import { at } from '@domain/testing/builders';
import { describe, expect, it } from 'vitest';
import * as map from './mappers';

/** The demo seed exercises every mapper with realistic data (all statuses, combos, consent…). */
const seed = createDemoSeed(at('10:20'));

describe('row ⇄ entity mappers', () => {
  it.each([
    ['barbershops', seed.barbershops, map.barbershopFromRow, map.barbershopToRow],
    ['users', seed.users, map.userFromRow, map.userToRow],
    ['professionals', seed.professionals, map.professionalFromRow, map.professionalToRow],
    ['services', seed.services, map.serviceFromRow, map.serviceToRow],
    ['clients', seed.clients, map.clientFromRow, map.clientToRow],
    ['appointments', seed.appointments, map.appointmentFromRow, map.appointmentToRow],
    ['timeBlocks', seed.timeBlocks, map.timeBlockFromRow, map.timeBlockToRow],
  ] as const)('round-trips %s without losing data', (_table, rows, fromRow, toRow) => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // @ts-expect-error — each tuple pairs rows with their own mappers; the union confuses TS.
      expect(toRow(fromRow(row))).toEqual(row);
    }
  });

  it('rejects unknown enum values from storage', () => {
    const [appointment] = seed.appointments;
    const [user] = seed.users;
    if (!appointment || !user) throw new Error('seed is empty');
    expect(() => map.appointmentFromRow({ ...appointment, status: 'LOST' })).toThrow(
      InvalidValueError,
    );
    expect(() => map.userFromRow({ ...user, role: 'ADMIN' })).toThrow(InvalidValueError);
  });

  it('rejects invalid weekdays and dates', () => {
    const [professional] = seed.professionals;
    const [block] = seed.timeBlocks;
    if (!professional || !block) throw new Error('seed is empty');
    expect(() =>
      map.professionalFromRow({
        ...professional,
        schedule: [{ weekday: 9, hours: ['09:00', '18:00'], breaks: [] }],
      }),
    ).toThrow(InvalidValueError);
    expect(() => map.timeBlockFromRow({ ...block, start: 'ontem' })).toThrow(InvalidValueError);
  });
});
