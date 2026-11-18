import { InvalidValueError } from '../errors/DomainError';
import { requireText } from '../shared/guards';
import type { Email } from '../value-objects/Email';
import type { BarbershopId, ProfessionalId, UserId } from './ids';

export const ROLES = ['OWNER', 'PROFESSIONAL', 'RECEPTIONIST'] as const;
export type Role = (typeof ROLES)[number];

const MAX_NAME_LENGTH = 80;

export interface UserProps {
  readonly id: UserId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly email: Email;
  readonly role: Role;
  /**
   * The professional profile this user works as.
   * Required for PROFESSIONAL, optional for OWNER (owner who also cuts hair), absent for RECEPTIONIST.
   */
  readonly professionalId: ProfessionalId | null;
}

/** Someone who signs in to the panel. */
export class User {
  readonly id: UserId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly email: Email;
  readonly role: Role;
  readonly professionalId: ProfessionalId | null;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.professionalId = props.professionalId;
  }

  static create(props: UserProps): User {
    if (props.role === 'PROFESSIONAL' && props.professionalId === null) {
      throw new InvalidValueError('user', 'professionals must be linked to a professional profile');
    }
    if (props.role === 'RECEPTIONIST' && props.professionalId !== null) {
      throw new InvalidValueError('user', 'receptionists cannot have a professional profile');
    }
    return new User({ ...props, name: requireText('userName', props.name, MAX_NAME_LENGTH) });
  }
}
