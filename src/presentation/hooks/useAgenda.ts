import type { AppointmentDTO } from '@application/dto/agenda';
import type { CompleteAppointmentInput } from '@application/use-cases';
import { formatMoney } from '@shared/format';
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
