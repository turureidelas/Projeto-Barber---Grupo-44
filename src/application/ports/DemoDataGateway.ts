import type { Role } from '@domain/entities/User';

/** A fictional account offered as one-tap sign-in on the demo login screen. */
export interface DemoAccount {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: Role;
}

/** Only available with mocks: demonstration data (Barbearia Nova Era). */
export interface DemoDataGateway {
  reset(): Promise<void>;
  listAccounts(): Promise<DemoAccount[]>;
}
