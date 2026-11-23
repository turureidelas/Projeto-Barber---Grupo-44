import { InvalidValueError } from '../errors/DomainError';

declare const kind: unique symbol;

/**
 * Branded string ID: a ClientId cannot be passed where a ProfessionalId is expected.
 * IDs are generated outside the domain (IdGenerator port) and only validated here.
 */
export type Id<Kind extends string> = string & { readonly [kind]: Kind };

export type BarbershopId = Id<'Barbershop'>;
export type UserId = Id<'User'>;
export type ProfessionalId = Id<'Professional'>;
export type ServiceId = Id<'Service'>;
export type ClientId = Id<'Client'>;
export type AppointmentId = Id<'Appointment'>;
export type TimeBlockId = Id<'TimeBlock'>;
export type NotificationId = Id<'Notification'>;

// The caller picks the ID kind explicitly: toId<ClientId>(raw).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function toId<T extends Id<string>>(value: string): T {
  if (value.trim() === '') {
    throw new InvalidValueError('id', 'must not be empty');
  }
  return value as T;
}
