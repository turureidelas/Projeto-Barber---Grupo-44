import { optionalText, requireText } from '../shared/guards';
import type { CancellationPolicy } from '../value-objects/CancellationPolicy';
import type { Phone } from '../value-objects/Phone';
import type { BarbershopId } from './ids';

const MAX_NAME_LENGTH = 80;
const MAX_ADDRESS_LENGTH = 200;

export interface BarbershopProps {
  readonly id: BarbershopId;
  readonly name: string;
  readonly phone: Phone;
  readonly address: string | null;
  readonly cancellationPolicy: CancellationPolicy;
}

export type BarbershopChanges = Partial<Pick<BarbershopProps, 'name' | 'phone' | 'address'>>;

export class Barbershop {
  readonly id: BarbershopId;
  readonly name: string;
  readonly phone: Phone;
  readonly address: string | null;
  readonly cancellationPolicy: CancellationPolicy;

  private constructor(props: BarbershopProps) {
    this.id = props.id;
    this.name = props.name;
    this.phone = props.phone;
    this.address = props.address;
    this.cancellationPolicy = props.cancellationPolicy;
  }

  static create(props: BarbershopProps): Barbershop {
    return new Barbershop({
      ...props,
      name: requireText('barbershopName', props.name, MAX_NAME_LENGTH),
      address: optionalText('address', props.address, MAX_ADDRESS_LENGTH),
    });
  }

  update(changes: BarbershopChanges): Barbershop {
    return Barbershop.create({ ...this.toProps(), ...changes });
  }

  changeCancellationPolicy(cancellationPolicy: CancellationPolicy): Barbershop {
    return Barbershop.create({ ...this.toProps(), cancellationPolicy });
  }

  toProps(): BarbershopProps {
    return {
      id: this.id,
      name: this.name,
      phone: this.phone,
      address: this.address,
      cancellationPolicy: this.cancellationPolicy,
    };
  }
}
