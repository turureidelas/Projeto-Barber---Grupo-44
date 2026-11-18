import type { ApplicationDependencies } from '@application/dependencies';
import type { Clock } from '@application/ports/Clock';
import type { IdGenerator } from '@application/ports/IdGenerator';
import { createUseCases, type UseCases } from '@application/use-cases';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { InMemoryAuthGateway } from '@infrastructure/auth/InMemoryAuthGateway';
import { InMemoryDatabase } from '@infrastructure/repositories/in-memory/InMemoryDatabase';
import { InMemoryDemoData } from '@infrastructure/repositories/in-memory/InMemoryDemoData';
import {
  InMemoryAppointmentRepository,
  InMemoryBarbershopRepository,
  InMemoryClientRepository,
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
  if (!options.env.useMocks) {
    // Phase 9 adds the HTTP adapters (VITE_USE_MOCKS=false).
    throw new Error('A integração com a API ainda não está disponível. Use VITE_USE_MOCKS=true.');
  }

  const clock = options.clock ?? new SystemClock();
  const db = new InMemoryDatabase({
    storage: options.storage,
    latencyMs: options.mockLatencyMs ?? 0,
  });
  const demoData = new InMemoryDemoData(db, clock);
  if (options.seedDemoData ?? true) {
    demoData.ensureSeeded();
  }

  const dependencies: ApplicationDependencies = {
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
    demoData,
  };

  return { useCases: createUseCases(dependencies), dependencies };
}
