import type { Appointment } from '@domain/entities/Appointment';
import type { Barbershop } from '@domain/entities/Barbershop';
import type { Client } from '@domain/entities/Client';
import {
  toId,
  type AppointmentId,
  type BarbershopId,
  type ClientId,
  type ProfessionalId,
  type ServiceId,
  type TimeBlockId,
} from '@domain/entities/ids';
import type { Professional } from '@domain/entities/Professional';
import type { Service } from '@domain/entities/Service';
import type { TimeBlock } from '@domain/entities/TimeBlock';
import type { User } from '@domain/entities/User';
import type { ApplicationDependencies as Deps } from '../dependencies';
import { NotFoundError, type ResourceName } from '../errors';

type Actor = Pick<User, 'barbershopId'>;

/** Not found OR from another barbershop → the same NotFoundError (no data leak between shops). */
function ensureFound<T extends { readonly barbershopId: BarbershopId }>(
  entity: T | null,
  actor: Actor,
  resource: ResourceName,
  id: string,
): T {
  if (entity?.barbershopId !== actor.barbershopId) {
    throw new NotFoundError(resource, id);
  }
  return entity;
}

export async function requireBarbershop(
  deps: Pick<Deps, 'barbershops'>,
  actor: Actor,
): Promise<Barbershop> {
  const barbershop = await deps.barbershops.findById(actor.barbershopId);
  if (!barbershop) {
    throw new NotFoundError('barbershop', actor.barbershopId);
  }
  return barbershop;
}

export async function requireAppointment(
  deps: Pick<Deps, 'appointments'>,
  actor: Actor,
  id: string,
): Promise<Appointment> {
  const found = await deps.appointments.findById(toId<AppointmentId>(id));
  return ensureFound(found, actor, 'appointment', id);
}

export async function requireProfessional(
  deps: Pick<Deps, 'professionals'>,
  actor: Actor,
  id: string,
): Promise<Professional> {
  const found = await deps.professionals.findById(toId<ProfessionalId>(id));
  return ensureFound(found, actor, 'professional', id);
}

export async function requireService(
  deps: Pick<Deps, 'services'>,
  actor: Actor,
  id: string,
): Promise<Service> {
  const found = await deps.services.findById(toId<ServiceId>(id));
  return ensureFound(found, actor, 'service', id);
}

export async function requireClient(
  deps: Pick<Deps, 'clients'>,
  actor: Actor,
  id: string,
): Promise<Client> {
  const found = await deps.clients.findById(toId<ClientId>(id));
  return ensureFound(found, actor, 'client', id);
}

export async function requireTimeBlock(
  deps: Pick<Deps, 'timeBlocks'>,
  actor: Actor,
  id: string,
): Promise<TimeBlock> {
  const found = await deps.timeBlocks.findById(toId<TimeBlockId>(id));
  return ensureFound(found, actor, 'timeBlock', id);
}
