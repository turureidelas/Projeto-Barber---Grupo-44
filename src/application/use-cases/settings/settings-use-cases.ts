import type { Barbershop } from '@domain/entities/Barbershop';
import { assertPermission } from '@domain/services/access-control';
import { CancellationPolicy } from '@domain/value-objects/CancellationPolicy';
import { Phone } from '@domain/value-objects/Phone';
import type { ApplicationDependencies } from '../../dependencies';
import type { BarbershopDTO } from '../../dto/catalog';
import { requireActor } from '../../services/actor';
import { toBarbershopDTO } from '../../services/assemblers';
import { requireBarbershop } from '../../services/lookups';
import type { UseCase } from '../UseCase';

type Deps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'barbershops'>;

/** Loads the actor's barbershop after checking they may change the settings. */
async function changeBarbershop(
  deps: Deps,
  change: (barbershop: Barbershop) => Barbershop,
): Promise<BarbershopDTO> {
  const actor = await requireActor(deps);
  assertPermission(actor, 'settings:manage');
  const updated = change(await requireBarbershop(deps, actor));
  await deps.barbershops.save(updated);
  return toBarbershopDTO(updated);
}

export interface UpdateBarbershopInput {
  readonly name: string;
  readonly phone: string;
  /** Blank = no address. */
  readonly address: string | null;
}

/** "Dados da barbearia". */
export class UpdateBarbershop implements UseCase<UpdateBarbershopInput, BarbershopDTO> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  execute(input: UpdateBarbershopInput): Promise<BarbershopDTO> {
    return changeBarbershop(this.deps, (barbershop) =>
      barbershop.update({
        name: input.name,
        phone: Phone.parse(input.phone),
        address: input.address,
      }),
    );
  }
}

export interface UpdateCancellationPolicyInput {
  /** Clients can cancel/reschedule up to this many hours before (0–168). */
  readonly minNoticeHours: number;
  /** Minutes after the start before "Cliente faltou" is allowed (0–120). */
  readonly noShowToleranceMinutes: number;
}

/**
 * "Política de cancelamento". Applies from now on: deadlines shown in the agenda are
 * calculated with the current policy.
 */
export class UpdateCancellationPolicy implements UseCase<
  UpdateCancellationPolicyInput,
  BarbershopDTO
> {
  private readonly deps: Deps;

  constructor(deps: Deps) {
    this.deps = deps;
  }

  execute(input: UpdateCancellationPolicyInput): Promise<BarbershopDTO> {
    return changeBarbershop(this.deps, (barbershop) =>
      barbershop.changeCancellationPolicy(CancellationPolicy.create(input)),
    );
  }
}
