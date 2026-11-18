import { hasPermission } from '@domain/services/access-control';
import type { ApplicationDependencies } from '../../dependencies';
import type {
  BarbershopDTO,
  ClientSummaryDTO,
  ProfessionalDTO,
  ServiceDTO,
} from '../../dto/catalog';
import { requireActor } from '../../services/actor';
import {
  toBarbershopDTO,
  toClientSummaryDTO,
  toProfessionalDTO,
  toServiceDTO,
} from '../../services/assemblers';
import { requireBarbershop } from '../../services/lookups';
import type { UseCase } from '../UseCase';

/** Read-only lists used across screens (pickers, filters). Full CRUD comes with the cadastros. */

export interface ListInput {
  readonly includeInactive?: boolean;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');

type ProfessionalsDeps = Pick<
  ApplicationDependencies,
  'auth' | 'users' | 'clock' | 'professionals'
>;

export class ListProfessionals implements UseCase<ListInput, ProfessionalDTO[]> {
  private readonly deps: ProfessionalsDeps;

  constructor(deps: ProfessionalsDeps) {
    this.deps = deps;
  }

  async execute(input: ListInput = {}): Promise<ProfessionalDTO[]> {
    const actor = await requireActor(this.deps);
    const canSeeCommission = hasPermission(actor, 'professionals:manage');
    const professionals = await this.deps.professionals.listByBarbershop(actor.barbershopId);
    return professionals
      .filter((professional) => input.includeInactive === true || professional.active)
      .sort(byName)
      .map((professional) => toProfessionalDTO(professional, canSeeCommission));
  }
}

type ServicesDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'services'>;

export class ListServices implements UseCase<ListInput, ServiceDTO[]> {
  private readonly deps: ServicesDeps;

  constructor(deps: ServicesDeps) {
    this.deps = deps;
  }

  async execute(input: ListInput = {}): Promise<ServiceDTO[]> {
    const actor = await requireActor(this.deps);
    const services = await this.deps.services.listByBarbershop(actor.barbershopId);
    return services
      .filter((service) => input.includeInactive === true || service.active)
      .sort(byName)
      .map(toServiceDTO);
  }
}

export interface SearchClientsInput {
  /** Part of the name or phone. Empty returns the first clients alphabetically. */
  readonly query: string;
  readonly limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type ClientsDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'clients'>;

/** Client picker / search. Contact data is masked (LGPD). */
export class SearchClients implements UseCase<SearchClientsInput, ClientSummaryDTO[]> {
  private readonly deps: ClientsDeps;

  constructor(deps: ClientsDeps) {
    this.deps = deps;
  }

  async execute(input: SearchClientsInput): Promise<ClientSummaryDTO[]> {
    const actor = await requireActor(this.deps);
    const limit = Math.min(Math.max(1, Math.trunc(input.limit ?? DEFAULT_LIMIT)), MAX_LIMIT);
    const clients = await this.deps.clients.search(actor.barbershopId, input.query.trim(), limit);
    return clients.map(toClientSummaryDTO);
  }
}

type BarbershopDeps = Pick<ApplicationDependencies, 'auth' | 'users' | 'clock' | 'barbershops'>;

export class GetBarbershop implements UseCase<void, BarbershopDTO> {
  private readonly deps: BarbershopDeps;

  constructor(deps: BarbershopDeps) {
    this.deps = deps;
  }

  async execute(): Promise<BarbershopDTO> {
    const actor = await requireActor(this.deps);
    return toBarbershopDTO(await requireBarbershop(this.deps, actor));
  }
}
