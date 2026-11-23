import type { AppointmentDTO, TimeBlockDTO } from '@application/dto/agenda';
import type {
  BlockTimeInput,
  CompleteAppointmentInput,
  ScheduleAppointmentInput,
} from '@application/use-cases';
import { formatDateTime, formatMoney } from '@shared/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../i18n/errors';
import { ptBR } from '../i18n/pt-BR';
import { queryKeys } from './query-keys';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

const REFRESH_MS = 60_000;

/** The day's agenda. Refreshes every minute so changes from the app/reception show up. */
export function useDailyAgenda(date: string, professionalId: string | null) {
  const { agenda } = useUseCases();
  return useQuery({
    queryKey: queryKeys.dailyAgenda(date, professionalId),
    queryFn: () =>
      agenda.getDailyAgenda.execute({ date, ...(professionalId && { professionalId }) }),
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

const t = ptBR.today;

/**
 * One-tap actions on an appointment. Each one refreshes the agenda and confirms with a toast;
 * "Faltou" offers "Desfazer" in the toast instead of a confirmation dialog.
 */
export function useAppointmentActions() {
  const { agenda } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.agenda });
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  const markArrived = useMutation({
    mutationFn: (appointment: AppointmentDTO) =>
      agenda.markArrived.execute({ appointmentId: appointment.id }),
    onSuccess: async (updated) => {
      toast.success(t.toasts.arrived(updated.clientName));
      await refresh();
    },
    onError: fail,
  });

  const undoNoShow = useMutation({
    mutationFn: (appointment: AppointmentDTO) =>
      agenda.markArrived.execute({ appointmentId: appointment.id }),
    onSuccess: async () => {
      toast.success(t.toasts.undone);
      await refresh();
    },
    onError: fail,
  });

  const markNoShow = useMutation({
    mutationFn: (appointment: AppointmentDTO) =>
      agenda.markNoShow.execute({ appointmentId: appointment.id }),
    onSuccess: async (updated) => {
      toast.success(t.toasts.noShow(updated.clientName), {
        action: {
          label: t.toasts.undo,
          onClick: () => {
            undoNoShow.mutate(updated);
          },
        },
      });
      await refresh();
    },
    onError: fail,
  });

  const complete = useMutation({
    mutationFn: (input: CompleteAppointmentInput) => agenda.completeAppointment.execute(input),
    onSuccess: async (updated) => {
      const amount = formatMoney(updated.payment?.amountPaidCents ?? updated.priceCents);
      toast.success(t.toasts.completed(updated.clientName, amount));
      await refresh();
    },
    onError: fail,
  });

  /** Which appointment has an action running (to show a spinner on the right card). */
  const pendingOneTap = [markArrived, markNoShow, undoNoShow].find(
    (mutation) => mutation.isPending,
  );
  let pendingId: string | null = null;
  if (pendingOneTap?.variables) pendingId = pendingOneTap.variables.id;
  else if (complete.isPending) pendingId = complete.variables.appointmentId;

  return { markArrived, markNoShow, undoNoShow, complete, pendingId };
}

export type AppointmentActions = ReturnType<typeof useAppointmentActions>;

/** One professional's week (7 days from startDate). */
export function useWeeklyAgenda(startDate: string, professionalId: string | null) {
  const { agenda } = useUseCases();
  return useQuery({
    queryKey: queryKeys.weeklyAgenda(startDate, professionalId ?? ''),
    queryFn: () =>
      agenda.getWeeklyAgenda.execute({ startDate, professionalId: professionalId ?? '' }),
    enabled: professionalId !== null,
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

export interface SlotQuery {
  readonly professionalId: string;
  readonly serviceId: string;
  readonly date: string;
  readonly ignoreAppointmentId?: string;
}

/** Free start times computed by the availability engine — the UI only offers these. */
export function useAvailableSlots(query: SlotQuery | null) {
  const { agenda } = useUseCases();
  return useQuery({
    queryKey: queryKeys.slots(
      query?.professionalId ?? '',
      query?.serviceId ?? '',
      query?.date ?? '',
      query?.ignoreAppointmentId ?? null,
    ),
    queryFn: () => {
      if (!query) return Promise.resolve([]);
      return agenda.listAvailableSlots.execute(query);
    },
    enabled: query !== null && query.professionalId !== '' && query.serviceId !== '',
  });
}

/** Confirm, reschedule, cancel, book, block and unblock — each with a toast and a refresh. */
export function useAgendaManagement() {
  const { agenda } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.agenda });
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  const confirm = useMutation({
    mutationFn: (appointment: AppointmentDTO) =>
      agenda.confirmAppointment.execute({ appointmentId: appointment.id }),
    onSuccess: async (updated) => {
      toast.success(ptBR.details.confirmed(updated.clientName));
      await refresh();
    },
    onError: fail,
  });

  const cancel = useMutation({
    mutationFn: (input: { appointment: AppointmentDTO; reason: string | null }) =>
      agenda.cancelAppointment.execute({
        appointmentId: input.appointment.id,
        reason: input.reason,
      }),
    onSuccess: async (updated) => {
      toast.success(ptBR.cancel.done(updated.clientName));
      await refresh();
    },
    onError: fail,
  });

  const reschedule = useMutation({
    mutationFn: (input: { appointment: AppointmentDTO; start: string; professionalId: string }) =>
      agenda.rescheduleAppointment.execute({
        appointmentId: input.appointment.id,
        start: input.start,
        professionalId: input.professionalId,
      }),
    onSuccess: async (updated) => {
      toast.success(ptBR.reschedule.done(updated.clientName, formatDateTime(updated.start)));
      await refresh();
    },
    onError: fail,
  });

  const schedule = useMutation({
    mutationFn: (input: ScheduleAppointmentInput) => agenda.scheduleAppointment.execute(input),
    onSuccess: async (created) => {
      toast.success(ptBR.newAppointment.done(created.clientName, formatDateTime(created.start)));
      await refresh();
    },
    onError: fail,
  });

  const block = useMutation({
    mutationFn: (input: BlockTimeInput) => agenda.blockTime.execute(input),
    onSuccess: async () => {
      toast.success(ptBR.block.done);
      await refresh();
    },
    onError: fail,
  });

  const unblock = useMutation({
    mutationFn: (timeBlock: TimeBlockDTO) =>
      agenda.unblockTime.execute({ timeBlockId: timeBlock.id }),
    onSuccess: async () => {
      toast.success(ptBR.week.unblocked);
      await refresh();
    },
    onError: fail,
  });

  return { confirm, cancel, reschedule, schedule, block, unblock };
}

export type AgendaManagement = ReturnType<typeof useAgendaManagement>;
