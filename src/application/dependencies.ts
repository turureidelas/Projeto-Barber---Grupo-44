import type { AvailabilityService } from '@domain/services/AvailabilityService';
import type { AuthGateway } from './ports/AuthGateway';
import type { Clock } from './ports/Clock';
import type { DemoDataGateway } from './ports/DemoDataGateway';
import type { IdGenerator } from './ports/IdGenerator';
import type {
  AppointmentRepository,
  BarbershopRepository,
  ClientRepository,
  ProfessionalRepository,
  ServiceRepository,
  TimeBlockRepository,
  UserRepository,
} from './ports/repositories';

/**
 * Everything use cases may depend on. Each use case declares the subset it needs with Pick<>,
 * and the composition root (src/main) provides the concrete implementations.
 */
export interface ApplicationDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly auth: AuthGateway;
  readonly availability: AvailabilityService;
  readonly barbershops: BarbershopRepository;
  readonly users: UserRepository;
  readonly professionals: ProfessionalRepository;
  readonly services: ServiceRepository;
  readonly clients: ClientRepository;
  readonly appointments: AppointmentRepository;
  readonly timeBlocks: TimeBlockRepository;
  /** null when running against the real API. */
  readonly demoData: DemoDataGateway | null;
}
