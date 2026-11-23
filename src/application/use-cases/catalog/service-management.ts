import { toId, type ServiceId } from '@domain/entities/ids';
import { Service } from '@domain/entities/Service';
import type { User } from '@domain/entities/User';
import { assertPermission } from '@domain/services/access-control';
import { Duration } from '@domain/value-objects/Duration';
import { Money } from '@domain/value-objects/Money';
import type { ApplicationDependencies } from '../../dependencies';
import type { ServiceDTO } from '../../dto/catalog';
import { requireActor } from '../../services/actor';
import { toServiceDTO } from '../../services/assemblers';
import { requireService } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/** Services and combos ("Serviços"). Only the owner manages them. */

export interface ServiceInput {
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceCents: number;
  /** Non-empty = combo (at least two single services). */
  readonly includedServiceIds: readonly string[];
}

type Deps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'ids' | 'services'>;

async function requireManager(deps: Deps): Promise<User> {
  const actor = await requireActor(deps);
  assertPermission(actor, 'services:manage');
  return actor;
}

function loadItems(deps: Deps, actor: User, ids: readonly string[]): Promise<Service[]> {
  return Promise.all(ids.map((id) => requireService(deps, actor, id)));
}

export class CreateService implements UseCase<ServiceInput, ServiceDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: ServiceInput): Promise<ServiceDTO> {
    const actor = await requireManager(this.deps);
    const base = {
      id: toId<ServiceId>(this.deps.ids.next()),
      barbershopId: actor.barbershopId,
      name: input.name,
      duration: Duration.ofMinutes(input.durationMinutes),
      price: Money.fromCents(input.priceCents),
    };
    const service =
      input.includedServiceIds.length > 0
        ? Service.createCombo({
            ...base,
            items: await loadItems(this.deps, actor, input.includedServiceIds),
          })
        : Service.createSingle(base);
    await this.deps.services.save(service);
    return toServiceDTO(service);
  }
}

export interface UpdateServiceInput extends ServiceInput {
  readonly serviceId: string;
}

/** Edits name, duration, price and (for combos) the included services. */
export class UpdateService implements UseCase<UpdateServiceInput, ServiceDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: UpdateServiceInput): Promise<ServiceDTO> {
    const actor = await requireManager(this.deps);
    const current = await requireService(this.deps, actor, input.serviceId);
    let updated = current.update({
      name: input.name,
      duration: Duration.ofMinutes(input.durationMinutes),
      price: Money.fromCents(input.priceCents),
    });
    if (updated.isCombo) {
      updated = updated.changeComboItems(
        await loadItems(this.deps, actor, input.includedServiceIds),
      );
    }
    await this.deps.services.save(updated);
    return toServiceDTO(updated);
  }
}

export interface SetActiveInput {
  readonly id: string;
  readonly active: boolean;
}

/** Deactivated services stay in history but can no longer be booked. */
export class SetServiceActive implements UseCase<SetActiveInput, ServiceDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  async execute(input: SetActiveInput): Promise<ServiceDTO> {
    const actor = await requireManager(this.deps);
    const current = await requireService(this.deps, actor, input.id);
    const updated = input.active ? current.activate() : current.deactivate();
    await this.deps.services.save(updated);
    return toServiceDTO(updated);
  }
}
