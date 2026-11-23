import type { ApplicationDependencies } from '../dependencies';
import type { DemoAccount } from '../ports/DemoDataGateway';
import type {
  AppointmentDTO,
  DailyAgendaDTO,
  SlotDTO,
  TimeBlockDTO,
  WeeklyAgendaDTO,
} from '../dto/agenda';
import type {
  BarbershopDTO,
  ClientDetailsDTO,
  ClientSummaryDTO,
  ProfessionalDetailsDTO,
  ProfessionalDTO,
  ServiceDTO,
  SessionUserDTO,
} from '../dto/catalog';
import type { NotificationListDTO } from '../dto/notifications';
import type { ReportDTO } from '../dto/reports';
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
import { GetWeeklyAgenda, type GetWeeklyAgendaInput } from './agenda/GetWeeklyAgenda';
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
import {
  AnonymizeClient,
  CreateClient,
  GetClientDetails,
  UpdateClient,
  type AnonymizeClientResult,
  type CreateClientInput,
  type UpdateClientInput,
} from './catalog/client-management';
import {
  CreateProfessional,
  GetProfessional,
  SetProfessionalActive,
  UpdateProfessional,
  UpdateWorkSchedule,
  type ProfessionalInput,
  type SetProfessionalActiveInput,
  type UpdateProfessionalInput,
  type UpdateWorkScheduleInput,
} from './catalog/professional-management';
import {
  CreateService,
  SetServiceActive,
  UpdateService,
  type ServiceInput,
  type SetActiveInput,
  type UpdateServiceInput,
} from './catalog/service-management';
import {
  SimulateClientCancel,
  SimulateClientReschedule,
  type SimulateClientCancelInput,
  type SimulateClientRescheduleInput,
} from './demo/client-simulator';
import { ListDemoAccounts, ResetDemoData } from './demo/ResetDemoData';
import {
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
} from './notifications/notification-use-cases';
import { GetReport, type GetReportInput } from './reports/GetReport';
import {
  UpdateBarbershop,
  UpdateCancellationPolicy,
  type UpdateBarbershopInput,
  type UpdateCancellationPolicyInput,
} from './settings/settings-use-cases';
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
    readonly getWeeklyAgenda: UseCase<GetWeeklyAgendaInput, WeeklyAgendaDTO>;
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
    readonly createService: UseCase<ServiceInput, ServiceDTO>;
    readonly updateService: UseCase<UpdateServiceInput, ServiceDTO>;
    readonly setServiceActive: UseCase<SetActiveInput, ServiceDTO>;
    readonly getProfessional: UseCase<{ professionalId: string }, ProfessionalDetailsDTO>;
    readonly createProfessional: UseCase<ProfessionalInput, ProfessionalDetailsDTO>;
    readonly updateProfessional: UseCase<UpdateProfessionalInput, ProfessionalDetailsDTO>;
    readonly updateWorkSchedule: UseCase<UpdateWorkScheduleInput, ProfessionalDetailsDTO>;
    readonly setProfessionalActive: UseCase<SetProfessionalActiveInput, ProfessionalDetailsDTO>;
    readonly createClient: UseCase<CreateClientInput, ClientSummaryDTO>;
    readonly updateClient: UseCase<UpdateClientInput, ClientSummaryDTO>;
    readonly getClientDetails: UseCase<{ clientId: string }, ClientDetailsDTO>;
    readonly anonymizeClient: UseCase<{ clientId: string }, AnonymizeClientResult>;
  };
  readonly reports: {
    readonly getReport: UseCase<GetReportInput, ReportDTO>;
  };
  readonly settings: {
    readonly updateBarbershop: UseCase<UpdateBarbershopInput, BarbershopDTO>;
    readonly updateCancellationPolicy: UseCase<UpdateCancellationPolicyInput, BarbershopDTO>;
  };
  readonly notifications: {
    readonly list: UseCase<void, NotificationListDTO>;
    readonly markRead: UseCase<{ notificationId: string }, void>;
    readonly markAllRead: UseCase<void, void>;
  };
  /** null when running against the real API. */
  readonly demo: {
    readonly resetDemoData: UseCase<void, void>;
    readonly listAccounts: UseCase<void, DemoAccount[]>;
    /** Stand-ins for the client app (not built yet): they leave a notice in the panel. */
    readonly simulateClientCancel: UseCase<SimulateClientCancelInput, AppointmentDTO>;
    readonly simulateClientReschedule: UseCase<SimulateClientRescheduleInput, AppointmentDTO>;
  } | null;
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
      getWeeklyAgenda: new GetWeeklyAgenda(deps),
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
      createService: new CreateService(deps),
      updateService: new UpdateService(deps),
      setServiceActive: new SetServiceActive(deps),
      getProfessional: new GetProfessional(deps),
      createProfessional: new CreateProfessional(deps),
      updateProfessional: new UpdateProfessional(deps),
      updateWorkSchedule: new UpdateWorkSchedule(deps),
      setProfessionalActive: new SetProfessionalActive(deps),
      createClient: new CreateClient(deps),
      updateClient: new UpdateClient(deps),
      getClientDetails: new GetClientDetails(deps),
      anonymizeClient: new AnonymizeClient(deps),
    },
    reports: {
      getReport: new GetReport(deps),
    },
    settings: {
      updateBarbershop: new UpdateBarbershop(deps),
      updateCancellationPolicy: new UpdateCancellationPolicy(deps),
    },
    notifications: {
      list: new ListNotifications(deps),
      markRead: new MarkNotificationRead(deps),
      markAllRead: new MarkAllNotificationsRead(deps),
    },
    demo: deps.demoData
      ? {
          resetDemoData: new ResetDemoData(deps.demoData),
          listAccounts: new ListDemoAccounts(deps.demoData),
          simulateClientCancel: new SimulateClientCancel(deps),
          simulateClientReschedule: new SimulateClientReschedule(deps),
        }
      : null,
  };
}

export type { UseCase } from './UseCase';
export type { DemoAccount } from '../ports/DemoDataGateway';
export type * from './agenda/appointment-status-commands';
export type { GetDailyAgendaInput } from './agenda/GetDailyAgenda';
export type { GetWeeklyAgendaInput } from './agenda/GetWeeklyAgenda';
export type { ListAvailableSlotsInput } from './agenda/ListAvailableSlots';
export type { RescheduleAppointmentInput } from './agenda/RescheduleAppointment';
export type { ScheduleAppointmentInput } from './agenda/ScheduleAppointment';
export type { BlockTimeInput, UnblockTimeInput } from './agenda/time-block-use-cases';
export type { SignInInput } from './auth/auth-use-cases';
export type { GetReportInput } from './reports/GetReport';
export type {
  UpdateBarbershopInput,
  UpdateCancellationPolicyInput,
} from './settings/settings-use-cases';
export type {
  SimulateClientCancelInput,
  SimulateClientRescheduleInput,
} from './demo/client-simulator';
export type { ListInput, SearchClientsInput } from './catalog/catalog-use-cases';
export type {
  AnonymizeClientResult,
  CreateClientInput,
  UpdateClientInput,
  ClientInput,
} from './catalog/client-management';
export type {
  ProfessionalInput,
  UpdateProfessionalInput,
  UpdateWorkScheduleInput,
  SetProfessionalActiveInput,
} from './catalog/professional-management';
export type {
  ServiceInput,
  UpdateServiceInput,
  SetActiveInput,
} from './catalog/service-management';
