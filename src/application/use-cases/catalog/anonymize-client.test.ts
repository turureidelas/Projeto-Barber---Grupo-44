import { NotFoundError, ResourceInactiveError } from '@application/errors';
import { PermissionDeniedError } from '@domain/errors/access-errors';
import { InvalidValueError } from '@domain/errors/DomainError';
import { at } from '@domain/testing/builders';
import { createTestApp, fixture, type TestApp } from '@main/testing/createTestApp';
import { beforeEach, describe, expect, it } from 'vitest';
import { ANONYMIZATION_CANCEL_REASON } from './client-management';

/** Wednesday 2026-11-18, 08:00. João has one finished visit and two upcoming bookings. */
let app: TestApp;
const iso = (time: string, date?: string) => at(time, date).toISOString();

beforeEach(async () => {
  app = createTestApp();
  await app.signInAs('owner');
});

const book = (start: string) =>
  app.useCases.agenda.scheduleAppointment.execute({
    professionalId: fixture.ricardo,
    clientId: fixture.joao,
    serviceId: fixture.haircut,
    start,
  });

describe('AnonymizeClient (LGPD)', () => {
  it('erases the personal data, keeps the history and cancels upcoming bookings', async () => {
    const done = await book(iso('09:00'));
    await app.useCases.agenda.completeAppointment.execute({
      appointmentId: done.id,
      amountPaidCents: 4500,
      paymentMethod: 'PIX',
    });
    const upcoming = await book(iso('10:00', '2026-11-20'));
    await book(iso('15:00'));

    const result = await app.useCases.catalog.anonymizeClient.execute({ clientId: fixture.joao });
    expect(result).toEqual({
      client: {
        id: fixture.joao,
        name: 'Cliente anonimizado',
        phoneMasked: null,
        emailMasked: null,
        anonymized: true,
      },
      cancelledAppointments: 2,
    });

    const details = await app.useCases.catalog.getClientDetails.execute({
      clientId: fixture.joao,
    });
    expect(details).toMatchObject({
      phone: null,
      email: null,
      consent: null,
      anonymizedAt: iso('08:00'),
      stats: { visits: 1, totalSpentCents: 4500 },
    });
    expect(details.history.find((item) => item.id === upcoming.id)).toMatchObject({
      status: 'CANCELLED',
      clientName: 'Cliente anonimizado',
      clientPhoneMasked: null,
      cancellation: { reason: ANONYMIZATION_CANCEL_REASON },
    });

    // Can't be found, booked or edited anymore.
    const search = await app.useCases.catalog.searchClients.execute({ query: '', limit: 10 });
    expect(search.map((client) => client.id)).toEqual([fixture.maria]);
    await expect(book(iso('16:00'))).rejects.toThrow(ResourceInactiveError);
    await expect(
      app.useCases.catalog.updateClient.execute({
        clientId: fixture.joao,
        name: 'João',
        phone: '(11) 98765-4321',
        email: null,
      }),
    ).rejects.toThrow(InvalidValueError);
    await expect(
      app.useCases.catalog.anonymizeClient.execute({ clientId: fixture.joao }),
    ).rejects.toThrow(InvalidValueError);
  });

  it('frees the phone number for someone else', async () => {
    await app.useCases.catalog.anonymizeClient.execute({ clientId: fixture.joao });
    const newClient = await app.useCases.catalog.createClient.execute({
      name: 'Pedro Alves',
      phone: '(11) 98765-4321',
      email: null,
      consentGiven: true,
    });
    expect(newClient.phoneMasked).toBe('(11) *****-4321');
  });

  it('is only for the owner', async () => {
    await app.useCases.auth.signOut.execute();
    await app.signInAs('receptionist');
    await expect(
      app.useCases.catalog.anonymizeClient.execute({ clientId: fixture.joao }),
    ).rejects.toThrow(PermissionDeniedError);

    await app.useCases.auth.signOut.execute();
    await app.signInAs('owner');
    await expect(
      app.useCases.catalog.anonymizeClient.execute({ clientId: 'client-unknown' }),
    ).rejects.toThrow(NotFoundError);
  });
});
