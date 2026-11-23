import type { Appointment } from '@domain/entities/Appointment';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { at } from '@domain/testing/builders';
import { LocalDate } from '@domain/value-objects/LocalDate';
import * as map from '@infrastructure/mappers/mappers';
import { describe, expect, it } from 'vitest';
import { createDemoSeed } from './demo-seed';

/** Generated on Wednesday 2026-11-18 at 10:20 (São Paulo). */
const NOW = at('10:20');
const seed = createDemoSeed(NOW);
const appointments = seed.appointments.map(map.appointmentFromRow);
const professionals = seed.professionals.map(map.professionalFromRow);
const timeBlocks = seed.timeBlocks.map(map.timeBlockFromRow);

describe('demo seed (Barbearia Nova Era)', () => {
  it('is deterministic for the same moment', () => {
    expect(createDemoSeed(NOW)).toEqual(seed);
  });

  it('has the expected cast', () => {
    expect(seed.barbershops.map((shop) => shop.name)).toEqual(['Barbearia Nova Era']);
    expect(seed.users.map((user) => user.role)).toEqual([
      'OWNER',
      'PROFESSIONAL',
      'PROFESSIONAL',
      'RECEPTIONIST',
    ]);
    expect(professionals.map((pro) => pro.name)).toEqual([
      'Ricardo Almeida',
      'Bruno Santos',
      'Diego Lima',
    ]);
    expect(seed.services.filter((service) => service.kind === 'COMBO')).toHaveLength(2);
    expect(seed.clients.length).toBe(360);
    expect(new Set(seed.clients.map((client) => client.phone)).size).toBe(360);
    expect(new Set(seed.clients.map((client) => client.name)).size).toBe(360);
    expect(seed.credentials).toHaveLength(seed.users.length);
  });

  it('generates a busy but realistic history and agenda', () => {
    expect(appointments.length).toBeGreaterThan(400);
    const statuses = new Set(appointments.map((appointment) => appointment.status));
    expect(statuses).toEqual(
      new Set(['COMPLETED', 'NO_SHOW', 'CANCELLED', 'SCHEDULED', 'CONFIRMED', 'IN_SERVICE']),
    );
    const today = LocalDate.fromInstant(NOW);
    const todays = appointments.filter((appointment) =>
      LocalDate.fromInstant(appointment.start).equals(today),
    );
    expect(todays.length).toBeGreaterThan(10);
  });

  it('never double-books, and respects schedules and blocks', () => {
    const availability = new AvailabilityService();
    const active = (list: readonly Appointment[]) =>
      list.filter((appointment) => appointment.isActive);

    for (const professional of professionals) {
      const own = appointments.filter(
        (appointment) => appointment.professionalId === professional.id,
      );
      const agenda = {
        professionalId: professional.id,
        schedule: professional.schedule,
        appointments: active(own),
        timeBlocks,
      };
      for (const appointment of own) {
        const check = availability.checkSlot(agenda, appointment.range, {
          now: new Date(0),
          ignoreAppointmentId: appointment.id,
        });
        expect(check, `${appointment.id} ${appointment.start.toISOString()}`).toEqual({
          available: true,
        });
      }
    }
  });

  it('keeps statuses consistent with time', () => {
    for (const appointment of appointments) {
      const ended = appointment.end.getTime() <= NOW.getTime();
      const started = appointment.start.getTime() <= NOW.getTime();
      if (ended) {
        expect(['COMPLETED', 'NO_SHOW', 'CANCELLED']).toContain(appointment.status);
      } else if (started) {
        expect(appointment.status).toBe('IN_SERVICE');
      } else {
        expect(['SCHEDULED', 'CONFIRMED', 'CANCELLED']).toContain(appointment.status);
      }
      expect(appointment.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(appointment.createdAt.getTime()).toBeLessThan(appointment.start.getTime());
    }
  });

  it('records payment on every completed appointment', () => {
    const completed = appointments.filter((appointment) => appointment.status === 'COMPLETED');
    expect(completed.length).toBeGreaterThan(0);
    for (const appointment of completed) {
      expect(appointment.serviceRecord?.amountPaid.cents).toBeGreaterThanOrEqual(
        appointment.price.cents,
      );
    }
  });
});
