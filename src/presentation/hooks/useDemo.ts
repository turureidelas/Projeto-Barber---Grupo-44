import type { AppointmentDTO } from '@application/dto/agenda';
import { formatDateTime } from '@shared/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../i18n/errors';
import { ptBR } from '../i18n/pt-BR';
import { queryKeys } from './query-keys';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

/** True when running with demonstration data (mocks). */
export function useIsDemo(): boolean {
  return useUseCases().demo !== null;
}

export function useDemoAccounts() {
  const { demo } = useUseCases();
  return useQuery({
    queryKey: queryKeys.demoAccounts,
    queryFn: () => demo?.listAccounts.execute() ?? Promise.resolve([]),
    enabled: demo !== null,
    staleTime: Infinity,
  });
}

export function useResetDemo() {
  const { demo } = useUseCases();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => demo?.resetDemoData.execute() ?? Promise.resolve(),
    onSuccess: async () => {
      // Everything on screen may have changed; the session (same user IDs) stays valid.
      await queryClient.invalidateQueries();
    },
  });
}

/** Demo only: does what the client app will do (cancel / reschedule) and leaves a notice. */
export function useClientSimulator() {
  const { demo } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();

  const simulator = () => {
    if (!demo) throw new Error('The client simulator only exists in demo mode.');
    return demo;
  };
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    ]);
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  return {
    cancel: useMutation({
      mutationFn: (appointment: AppointmentDTO) =>
        simulator().simulateClientCancel.execute({ appointmentId: appointment.id }),
      onSuccess: async (updated) => {
        toast.success(ptBR.simulator.cancelled(updated.clientName));
        await refresh();
      },
      onError: fail,
    }),
    reschedule: useMutation({
      mutationFn: (input: { appointment: AppointmentDTO; start: string }) =>
        simulator().simulateClientReschedule.execute({
          appointmentId: input.appointment.id,
          start: input.start,
        }),
      onSuccess: async (updated) => {
        toast.success(
          ptBR.simulator.rescheduled(updated.clientName, formatDateTime(updated.start)),
        );
        await refresh();
      },
      onError: fail,
    }),
  };
}
