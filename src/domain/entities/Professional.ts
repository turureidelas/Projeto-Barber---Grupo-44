import { optionalText, requireText } from '../shared/guards';
import type { Money } from '../value-objects/Money';
import type { Percentage } from '../value-objects/Percentage';
import type { WorkSchedule } from '../value-objects/WorkSchedule';
import type { BarbershopId, ProfessionalId } from './ids';

const MAX_NAME_LENGTH = 80;
const MAX_SPECIALTY_LENGTH = 80;
const MAX_PHOTO_URL_LENGTH = 2048;

export interface ProfessionalProps {
  readonly id: ProfessionalId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly specialty: string | null;
  readonly photoUrl: string | null;
  /** Share of what the client paid that goes to the professional. */
  readonly commission: Percentage;
  readonly schedule: WorkSchedule;
  readonly active: boolean;
}

export type ProfessionalChanges = Partial<
  Pick<ProfessionalProps, 'name' | 'specialty' | 'photoUrl' | 'commission'>
>;

export class Professional {
  readonly id: ProfessionalId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly specialty: string | null;
  readonly photoUrl: string | null;
  readonly commission: Percentage;
  readonly schedule: WorkSchedule;
  readonly active: boolean;

  private constructor(props: ProfessionalProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.specialty = props.specialty;
    this.photoUrl = props.photoUrl;
    this.commission = props.commission;
    this.schedule = props.schedule;
    this.active = props.active;
  }

  static create(props: ProfessionalProps): Professional {
    return new Professional({
      ...props,
      name: requireText('professionalName', props.name, MAX_NAME_LENGTH),
      specialty: optionalText('specialty', props.specialty, MAX_SPECIALTY_LENGTH),
      photoUrl: optionalText('photoUrl', props.photoUrl, MAX_PHOTO_URL_LENGTH),
    });
  }

  /** Commission over the amount actually paid by the client. */
  commissionOn(amountPaid: Money): Money {
    return amountPaid.percentage(this.commission);
  }

  update(changes: ProfessionalChanges): Professional {
    return Professional.create({ ...this.toProps(), ...changes });
  }

  changeSchedule(schedule: WorkSchedule): Professional {
    return Professional.create({ ...this.toProps(), schedule });
  }

  activate(): Professional {
    return Professional.create({ ...this.toProps(), active: true });
  }

  deactivate(): Professional {
    return Professional.create({ ...this.toProps(), active: false });
  }

  toProps(): ProfessionalProps {
    return {
      id: this.id,
      barbershopId: this.barbershopId,
      name: this.name,
      specialty: this.specialty,
      photoUrl: this.photoUrl,
      commission: this.commission,
      schedule: this.schedule,
      active: this.active,
    };
  }
}
