import type { AppointmentDTO } from '@application/dto/agenda';
import type { SignUpClientInput } from '@application/use-cases';
import { formatDateTime } from '@shared/format';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../i18n/errors';
import { ptBR } from '../i18n/pt-BR';
import { queryKeys } from './query-keys';
import type { SlotQuery } from './useAgenda';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

const t = ptBR.clientArea;
const PUBLIC_STALE_MS = 5 * 60_000;

/** Public: barbershops where a client can create an account. */
export function useBarbershops() {
  const { client } = useUseCases();
  return useQuery({
    queryKey: queryKeys.barbershops,
    queryFn: () => client.listBarbershops.execute(),
    staleTime: PUBLIC_STALE_MS,
  });
}

/** Creates the client account and signs in (the session query gets the new user). */
export function useSignUpClient() {
  const { client } = useUseCases();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignUpClientInput) => client.signUp.execute(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.session, user);
    },
  });
}

export function useMyAppointments() {
  const { client } = useUseCases();
  return useQuery({
    queryKey: queryKeys.myAppointments,
    queryFn: () => client.getMyAppointments.execute(),
  });
}

export function useMyProfile() {
  const { client } = useUseCases();
  return useQuery({
    queryKey: queryKeys.clientProfile,
    queryFn: () => client.getProfile.execute(),
  });
}

/** Free times for the client (availability engine) — only these can be picked. */
export function useClientSlots(query: SlotQuery | null) {
  const { client } = useUseCases();
  return useQuery({
    queryKey: queryKeys.clientSlots(
      query?.professionalId ?? '',
      query?.serviceId ?? '',
      query?.date ?? '',
      query?.ignoreAppointmentId ?? null,
    ),
    queryFn: () => {
      if (!query) return Promise.resolve([]);
      return client.listSlots.execute(query);
    },
    enabled: query !== null && query.professionalId !== '' && query.serviceId !== '',
  });
}

/** Book, cancel and reschedule as the client — each with a toast and a refresh. */
export function useClientBookingActions() {
  const { client } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.agenda });
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  const book = useMutation({
    mutationFn: (input: { professionalId: string; serviceId: string; start: string }) =>
      client.book.execute(input),
    onSuccess: async (created) => {
      toast.success(t.book.booked(formatDateTime(created.start)));
      await refresh();
    },
    onError: fail,
  });

  const cancel = useMutation({
    mutationFn: (appointment: AppointmentDTO) =>
      client.cancel.execute({ appointmentId: appointment.id }),
    onSuccess: async () => {
      toast.success(t.home.cancelled);
      await refresh();
    },
    onError: fail,
  });

  const reschedule = useMutation({
    mutationFn: (input: { appointment: AppointmentDTO; start: string }) =>
      client.reschedule.execute({ appointmentId: input.appointment.id, start: input.start }),
    onSuccess: async (moved) => {
      toast.success(t.home.rescheduled(formatDateTime(moved.start)));
      await refresh();
    },
    onError: fail,
  });

  return { book, cancel, reschedule };
}
