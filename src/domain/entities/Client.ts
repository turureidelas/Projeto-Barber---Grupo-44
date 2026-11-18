import { requireText } from '../shared/guards';
import type { Email } from '../value-objects/Email';
import type { Phone } from '../value-objects/Phone';
import type { BarbershopId, ClientId } from './ids';

const MAX_NAME_LENGTH = 80;
const MAX_TERMS_VERSION_LENGTH = 20;

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
  readonly phone: Phone;
  readonly email: Email | null;
  readonly consent: ClientConsent | null;
  readonly createdAt: Date;
}

export type ClientChanges = Partial<Pick<ClientProps, 'name' | 'phone' | 'email'>>;

export class Client {
  readonly id: ClientId;
  readonly barbershopId: BarbershopId;
  readonly name: string;
  readonly phone: Phone;
  readonly email: Email | null;
  readonly consent: ClientConsent | null;
  readonly createdAt: Date;

  private constructor(props: ClientProps) {
    this.id = props.id;
    this.barbershopId = props.barbershopId;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
    this.consent = props.consent;
    this.createdAt = props.createdAt;
  }

  static create(props: ClientProps): Client {
    return new Client({
      ...props,
      name: requireText('clientName', props.name, MAX_NAME_LENGTH),
      consent: props.consent && validateConsent(props.consent),
    });
  }

  get hasConsent(): boolean {
    return this.consent !== null;
  }

  update(changes: ClientChanges): Client {
    return Client.create({ ...this.toProps(), ...changes });
  }

  grantConsent(consent: ClientConsent): Client {
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
    };
  }
}

function validateConsent(consent: ClientConsent): ClientConsent {
  return {
    ...consent,
    termsVersion: requireText('termsVersion', consent.termsVersion, MAX_TERMS_VERSION_LENGTH),
  };
}
