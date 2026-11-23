import { InvalidValueError } from '../errors/DomainError';
import { requireText } from '../shared/guards';
import type { Email } from '../value-objects/Email';
import type { Phone } from '../value-objects/Phone';
import type { BarbershopId, ClientId } from './ids';

const MAX_NAME_LENGTH = 80;
const MAX_TERMS_VERSION_LENGTH = 20;

/** What an anonymized client is called (the person can no longer be identified). */
export const ANONYMIZED_CLIENT_NAME = 'Cliente anonimizado';

export const CONSENT_CHANNELS = ['APP', 'PANEL'] as const;
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

/** LGPD: when and how the client agreed to have their data stored. */
export interface ClientConsent {
  readonly grantedAt: Date;
  readonly termsVersion: string;
  readonly channel: ConsentChannel;
}

/** LGPD data minimization: only name and phone are required; e-mail is optional. */
export interface ClientProps {
  readonly id: ClientId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  /** Required, except once anonymized. */
  readonly phone: Phone | null;
  readonly email: Email | null;
  readonly consent: ClientConsent | null;
  readonly createdAt: Date;
  /** LGPD "eliminação": when the personal data was erased at the client's request. */
  readonly anonymizedAt?: Date | null;
}

export interface ClientChanges {
  readonly name?: string;
  readonly phone?: Phone;
  readonly email?: Email | null;
}

export class Client {
  readonly id: ClientId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly phone: Phone | null;
  readonly email: Email | null;
  readonly consent: ClientConsent | null;
  readonly createdAt: Date;
  readonly anonymizedAt: Date | null;

  private constructor(props: ClientProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
    this.consent = props.consent;
    this.createdAt = props.createdAt;
    this.anonymizedAt = props.anonymizedAt ?? null;
  }

  static create(props: ClientProps): Client {
    const anonymized = (props.anonymizedAt ?? null) !== null;
    if (!anonymized && props.phone === null) {
      throw new InvalidValueError('phone', 'is required');
    }
    if (anonymized && (props.phone !== null || props.email !== null || props.consent !== null)) {
      throw new InvalidValueError('client', 'an anonymized client keeps no contact data');
    }
    return new Client({
      ...props,
      name: requireText('clientName', props.name, MAX_NAME_LENGTH),
      consent: props.consent && validateConsent(props.consent),
    });
  }

  get hasConsent(): boolean {
    return this.consent !== null;
  }

  get isAnonymized(): boolean {
    return this.anonymizedAt !== null;
  }

  update(changes: ClientChanges): Client {
    this.ensureNotAnonymized();
    return Client.create({ ...this.toProps(), ...changes });
  }

  /**
   * LGPD right to erasure: removes name, phone, e-mail and consent for good. The appointment
   * history stays (for the barbershop's numbers), but no longer points to a person.
   */
  anonymize(now: Date): Client {
    this.ensureNotAnonymized();
    return Client.create({
      ...this.toProps(),
      name: ANONYMIZED_CLIENT_NAME,
      phone: null,
      email: null,
      consent: null,
      anonymizedAt: now,
    });
  }

  private ensureNotAnonymized(): void {
    if (this.isAnonymized) {
      throw new InvalidValueError('client', 'was anonymized and cannot be changed');
    }
  }

  grantConsent(consent: ClientConsent): Client {
    this.ensureNotAnonymized();
    return Client.create({ ...this.toProps(), consent });
  }

  revokeConsent(): Client {
    return Client.create({ ...this.toProps(), consent: null });
  }

  toProps(): ClientProps {
    return {
      id: this.id,
      barbershopId: this.barbershopId,
      name: this.name,
      phone: this.phone,
      email: this.email,
      consent: this.consent,
      createdAt: this.createdAt,
      anonymizedAt: this.anonymizedAt,
    };
  }
}

function validateConsent(consent: ClientConsent): ClientConsent {
  return {
    ...consent,
    termsVersion: requireText('termsVersion', consent.termsVersion, MAX_TERMS_VERSION_LENGTH),
  };
}
