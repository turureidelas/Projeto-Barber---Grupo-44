import { InvalidValueError } from '../errors/DomainError';
import { requireText } from '../shared/guards';
import type { Duration } from '../value-objects/Duration';
import type { Money } from '../value-objects/Money';
import type { BarbershopId, ServiceId } from './ids';

export const SERVICE_KINDS = ['SINGLE', 'COMBO'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

const MAX_NAME_LENGTH = 60;
const MIN_COMBO_ITEMS = 2;

export interface ServiceProps {
  readonly id: ServiceId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly duration: Duration;
  readonly price: Money;
  readonly kind: ServiceKind;
  /** For combos: the single services included. Empty for single services. */
  readonly includedServiceIds: readonly ServiceId[];
  readonly active: boolean;
}

export type SingleServiceInput = Pick<
  ServiceProps,
  'id' | 'barbershopId' | 'name' | 'duration' | 'price'
>;

export interface ComboInput extends SingleServiceInput {
  readonly items: readonly Service[];
}

export type ServiceChanges = Partial<Pick<ServiceProps, 'name' | 'duration' | 'price'>>;

/** A service ("Corte") or a combo ("Corte + Barba") with its own duration and price. */
export class Service {
  readonly id: ServiceId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly duration: Duration;
  readonly price: Money;
  readonly kind: ServiceKind;
  readonly includedServiceIds: readonly ServiceId[];
  readonly active: boolean;

  private constructor(props: ServiceProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.duration = props.duration;
    this.price = props.price;
    this.kind = props.kind;
    this.includedServiceIds = props.includedServiceIds;
    this.active = props.active;
  }

  static createSingle(input: SingleServiceInput): Service {
    return Service.restore({ ...input, kind: 'SINGLE', includedServiceIds: [], active: true });
  }

  static createCombo(input: ComboInput): Service {
    const { items, ...rest } = input;
    for (const item of items) {
      if (item.kind !== 'SINGLE') {
        throw new InvalidValueError('combo', 'can only include single services');
      }
      if (item.barbershopId !== input.barbershopId) {
        throw new InvalidValueError('combo', 'items must belong to the same barbershop');
      }
    }
    return Service.restore({
      ...rest,
      kind: 'COMBO',
      includedServiceIds: items.map((item) => item.id),
      active: true,
    });
  }

  static restore(props: ServiceProps): Service {
    validateComposition(props);
    return new Service({ ...props, name: requireText('serviceName', props.name, MAX_NAME_LENGTH) });
  }

  get isCombo(): boolean {
    return this.kind === 'COMBO';
  }

  update(changes: ServiceChanges): Service {
    return Service.restore({ ...this.toProps(), ...changes });
  }

  activate(): Service {
    return Service.restore({ ...this.toProps(), active: true });
  }

  deactivate(): Service {
    return Service.restore({ ...this.toProps(), active: false });
  }

  toProps(): ServiceProps {
    return {
      id: this.id,
      barbershopId: this.barbershopId,
      name: this.name,
      duration: this.duration,
      price: this.price,
      kind: this.kind,
      includedServiceIds: this.includedServiceIds,
      active: this.active,
    };
  }
}

function validateComposition(props: ServiceProps): void {
  const ids = props.includedServiceIds;
  if (props.kind === 'SINGLE' && ids.length > 0) {
    throw new InvalidValueError('service', 'single services cannot include other services');
  }
  if (props.kind === 'COMBO') {
    if (new Set(ids).size !== ids.length) {
      throw new InvalidValueError('combo', 'cannot include the same service twice');
    }
    if (ids.length < MIN_COMBO_ITEMS) {
      throw new InvalidValueError('combo', `must include at least ${MIN_COMBO_ITEMS} services`);
    }
    if (ids.includes(props.id)) {
      throw new InvalidValueError('combo', 'cannot include itself');
    }
  }
}
