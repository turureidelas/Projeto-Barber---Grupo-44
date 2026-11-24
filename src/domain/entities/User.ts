import { InvalidValueError } from '../errors/DomainError';
import { requireText } from '../shared/guards';
import type { Email } from '../value-objects/Email';
import type { BarbershopId, ClientId, ProfessionalId, UserId } from './ids';

export const ROLES = ['OWNER', 'PROFESSIONAL', 'RECEPTIONIST', 'CLIENT'] as const;
export type Role = (typeof ROLES)[number];

/** People who work at the barbershop and use the panel (everyone except clients). */
export const STAFF_ROLES = ['OWNER', 'PROFESSIONAL', 'RECEPTIONIST'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

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
  /** The client record of a CLIENT account (books for themselves); absent for staff. */
  readonly clientId?: ClientId | null;
}

/** Someone who signs in: staff (panel) or a client (client area). */
export class User {
  readonly id: UserId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly email: Email;
  readonly role: Role;
  readonly professionalId: ProfessionalId | null;
  readonly clientId: ClientId | null;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.professionalId = props.professionalId;
    this.clientId = props.clientId ?? null;
  }

  static create(props: UserProps): User {
    if (props.role === 'PROFESSIONAL' && props.professionalId === null) {
      throw new InvalidValueError('user', 'professionals must be linked to a professional profile');
    }
    if (props.role === 'RECEPTIONIST' && props.professionalId !== null) {
      throw new InvalidValueError('user', 'receptionists cannot have a professional profile');
    }
    const isClient = props.role === 'CLIENT';
    if (isClient && (props.clientId ?? null) === null) {
      throw new InvalidValueError('user', 'client accounts must be linked to a client record');
    }
    if (isClient && props.professionalId !== null) {
      throw new InvalidValueError('user', 'client accounts cannot have a professional profile');
    }
    if (!isClient && (props.clientId ?? null) !== null) {
      throw new InvalidValueError('user', 'only client accounts are linked to a client record');
    }
    return new User({ ...props, name: requireText('userName', props.name, MAX_NAME_LENGTH) });
  }

  get isClient(): boolean {
    return this.role === 'CLIENT';
  }
}
