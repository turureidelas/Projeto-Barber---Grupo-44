import type { ApplicationDependencies } from '@application/dependencies';
import type { Clock } from '@application/ports/Clock';
import type { IdGenerator } from '@application/ports/IdGenerator';
import { createUseCases, type UseCases } from '@application/use-cases';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { HttpAuthGateway } from '@infrastructure/auth/HttpAuthGateway';
import { InMemoryAuthGateway } from '@infrastructure/auth/InMemoryAuthGateway';
import { HttpClient, type FetchFn } from '@infrastructure/http/HttpClient';
import {
  HttpAppointmentRepository,
  HttpBarbershopRepository,
  HttpClientRepository,
  HttpNotificationRepository,
  HttpProfessionalRepository,
  HttpServiceRepository,
  HttpTimeBlockRepository,
  HttpUserRepository,
} from '@infrastructure/repositories/http/http-repositories';
import { InMemoryDatabase } from '@infrastructure/repositories/in-memory/InMemoryDatabase';
import { InMemoryDemoData } from '@infrastructure/repositories/in-memory/InMemoryDemoData';
import {
  InMemoryAppointmentRepository,
  InMemoryBarbershopRepository,
  InMemoryClientRepository,
  InMemoryNotificationRepository,
  InMemoryProfessionalRepository,
  InMemoryServiceRepository,
  InMemoryTimeBlockRepository,
  InMemoryUserRepository,
} from '@infrastructure/repositories/in-memory/in-memory-repositories';
import type { KeyValueStorage } from '@infrastructure/storage/KeyValueStorage';
import { CryptoIdGenerator, SystemClock } from '@infrastructure/system/system';
import type { AppEnv } from './config/env';

export interface ContainerOptions {
  readonly env: AppEnv;
  readonly storage: KeyValueStorage;
  readonly clock?: Clock;
  readonly ids?: IdGenerator;
  /** Artificial delay of the mock database (ms). */
  readonly mockLatencyMs?: number;
  /** Seed demo data on first run (mock mode). */
  readonly seedDemoData?: boolean;
  /** API mode: replaces window.fetch (tests). */
  readonly fetch?: FetchFn;
}

export interface Container {
  readonly useCases: UseCases;
  /** Exposed for tests and tooling only — the UI must go through use cases. */
  readonly dependencies: ApplicationDependencies;
}

/**
 * Composition root: the only place that knows which implementation backs each port.
 * Swapping mocks for the real API happens here, without touching use cases or screens.
 */
export function createContainer(options: ContainerOptions): Container {
  const dependencies = options.env.useMocks ? mockDependencies(options) : apiDependencies(options);
  return { useCases: createUseCases(dependencies), dependencies };
}

/** VITE_USE_MOCKS=true: in-memory repositories with the Barbearia Nova Era demo. */
function mockDependencies(options: ContainerOptions): ApplicationDependencies {
  const clock = options.clock ?? new SystemClock();
  const db = new InMemoryDatabase({
    storage: options.storage,
    latencyMs: options.mockLatencyMs ?? 0,
  });
  const demoData = new InMemoryDemoData(db, clock);
  if (options.seedDemoData ?? true) {
    demoData.ensureSeeded();
  }

  return {
    clock,
    ids: options.ids ?? new CryptoIdGenerator(),
    auth: new InMemoryAuthGateway(db, options.storage, clock),
    availability: new AvailabilityService(),
    barbershops: new InMemoryBarbershopRepository(db),
    users: new InMemoryUserRepository(db),
    professionals: new InMemoryProfessionalRepository(db),
    services: new InMemoryServiceRepository(db),
    clients: new InMemoryClientRepository(db),
    appointments: new InMemoryAppointmentRepository(db),
    timeBlocks: new InMemoryTimeBlockRepository(db),
    notifications: new InMemoryNotificationRepository(db),
    demoData,
  };
}

/** VITE_USE_MOCKS=false: the same ports over the API at VITE_API_URL. No demo tools. */
function apiDependencies(options: ContainerOptions): ApplicationDependencies {
  const auth = new HttpAuthGateway(options.storage);
  const http = new HttpClient({
    baseUrl: options.env.apiUrl,
    getToken: () => auth.token(),
    ...(options.fetch && { fetch: options.fetch }),
  });
  auth.connect(http);

  return {
    clock: options.clock ?? new SystemClock(),
    ids: options.ids ?? new CryptoIdGenerator(),
    auth,
    availability: new AvailabilityService(),
    barbershops: new HttpBarbershopRepository(http),
    users: new HttpUserRepository(http),
    professionals: new HttpProfessionalRepository(http),
    services: new HttpServiceRepository(http),
    clients: new HttpClientRepository(http),
    appointments: new HttpAppointmentRepository(http),
    timeBlocks: new HttpTimeBlockRepository(http),
    notifications: new HttpNotificationRepository(http),
    demoData: null,
  };
}
