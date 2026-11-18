import type { ApplicationDependencies } from '../dependencies';
import type { AppointmentDTO, DailyAgendaDTO, SlotDTO, TimeBlockDTO } from '../dto/agenda';
import type {
  BarbershopDTO,
  ClientSummaryDTO,
  ProfessionalDTO,
  ServiceDTO,
  SessionUserDTO,
} from '../dto/catalog';
import {
  CancelAppointment,
  CompleteAppointment,
  ConfirmAppointment,
  MarkArrived,
  MarkNoShow,
  type AppointmentCommandInput,
  type CancelAppointmentInput,
  type CompleteAppointmentInput,
} from './agenda/appointment-status-commands';
import { GetDailyAgenda, type GetDailyAgendaInput } from './agenda/GetDailyAgenda';
import { ListAvailableSlots, type ListAvailableSlotsInput } from './agenda/ListAvailableSlots';
import {
  RescheduleAppointment,
  type RescheduleAppointmentInput,
} from './agenda/RescheduleAppointment';
import { ScheduleAppointment, type ScheduleAppointmentInput } from './agenda/ScheduleAppointment';
import {
  BlockTime,
  UnblockTime,
  type BlockTimeInput,
  type UnblockTimeInput,
} from './agenda/time-block-use-cases';
import { GetCurrentUser, SignIn, SignOut, type SignInInput } from './auth/auth-use-cases';
import {
  GetBarbershop,
  ListProfessionals,
  ListServices,
  SearchClients,
  type ListInput,
  type SearchClientsInput,
} from './catalog/catalog-use-cases';
import { ResetDemoData } from './demo/ResetDemoData';
import type { UseCase } from './UseCase';

/**
 * Everything the UI can do. The presentation layer depends only on this contract,
 * which makes it trivial to fake in component tests.
 */
export interface UseCases {
  readonly auth: {
    readonly signIn: UseCase<SignInInput, SessionUserDTO>;
    readonly signOut: UseCase<void, void>;
    readonly getCurrentUser: UseCase<void, SessionUserDTO | null>;
  };
  readonly agenda: {
    readonly getDailyAgenda: UseCase<GetDailyAgendaInput, DailyAgendaDTO>;
    readonly listAvailableSlots: UseCase<ListAvailableSlotsInput, SlotDTO[]>;
    readonly scheduleAppointment: UseCase<ScheduleAppointmentInput, AppointmentDTO>;
    readonly confirmAppointment: UseCase<AppointmentCommandInput, AppointmentDTO>;
    readonly markArrived: UseCase<AppointmentCommandInput, AppointmentDTO>;
    readonly markNoShow: UseCase<AppointmentCommandInput, AppointmentDTO>;
    readonly completeAppointment: UseCase<CompleteAppointmentInput, AppointmentDTO>;
    readonly cancelAppointment: UseCase<CancelAppointmentInput, AppointmentDTO>;
    readonly rescheduleAppointment: UseCase<RescheduleAppointmentInput, AppointmentDTO>;
    readonly blockTime: UseCase<BlockTimeInput, TimeBlockDTO>;
    readonly unblockTime: UseCase<UnblockTimeInput, void>;
  };
  readonly catalog: {
    readonly listProfessionals: UseCase<ListInput, ProfessionalDTO[]>;
    readonly listServices: UseCase<ListInput, ServiceDTO[]>;
    readonly searchClients: UseCase<SearchClientsInput, ClientSummaryDTO[]>;
    readonly getBarbershop: UseCase<void, BarbershopDTO>;
  };
  /** null when running against the real API. */
  readonly demo: { readonly resetDemoData: UseCase<void, void> } | null;
}

export function createUseCases(deps: ApplicationDependencies): UseCases {
  return {
    auth: {
      signIn: new SignIn(deps),
      signOut: new SignOut(deps),
      getCurrentUser: new GetCurrentUser(deps),
    },
    agenda: {
      getDailyAgenda: new GetDailyAgenda(deps),
      listAvailableSlots: new ListAvailableSlots(deps),
      scheduleAppointment: new ScheduleAppointment(deps),
      confirmAppointment: new ConfirmAppointment(deps),
      markArrived: new MarkArrived(deps),
      markNoShow: new MarkNoShow(deps),
      completeAppointment: new CompleteAppointment(deps),
      cancelAppointment: new CancelAppointment(deps),
      rescheduleAppointment: new RescheduleAppointment(deps),
      blockTime: new BlockTime(deps),
      unblockTime: new UnblockTime(deps),
    },
    catalog: {
      listProfessionals: new ListProfessionals(deps),
      listServices: new ListServices(deps),
      searchClients: new SearchClients(deps),
      getBarbershop: new GetBarbershop(deps),
    },
    demo: deps.demoData ? { resetDemoData: new ResetDemoData(deps.demoData) } : null,
  };
}

export type { UseCase } from './UseCase';
export type * from './agenda/appointment-status-commands';
export type { GetDailyAgendaInput } from './agenda/GetDailyAgenda';
export type { ListAvailableSlotsInput } from './agenda/ListAvailableSlots';
export type { RescheduleAppointmentInput } from './agenda/RescheduleAppointment';
export type { ScheduleAppointmentInput } from './agenda/ScheduleAppointment';
export type { BlockTimeInput, UnblockTimeInput } from './agenda/time-block-use-cases';
export type { SignInInput } from './auth/auth-use-cases';
export type { ListInput, SearchClientsInput } from './catalog/catalog-use-cases';
