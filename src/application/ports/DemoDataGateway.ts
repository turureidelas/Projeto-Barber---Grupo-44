/** Only available with mocks: restores the demonstration data (Barbearia Nova Era). */
export interface DemoDataGateway {
  reset(): Promise<void>;
}
