import type { UpdateBarbershopInput, UpdateCancellationPolicyInput } from '@application/use-cases';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../i18n/errors';
import { ptBR } from '../i18n/pt-BR';
import { queryKeys } from './query-keys';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

/** Barbershop details and cancellation policy. */
export function useBarbershop() {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.barbershop,
    queryFn: () => catalog.getBarbershop.execute(),
  });
}

export function useSettingsMutations() {
  const { settings } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();
  // Deadlines shown in the agenda come from the policy, so refresh it too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.barbershop }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda }),
    ]);
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };

  return {
    updateBarbershop: useMutation({
      mutationFn: (input: UpdateBarbershopInput) => settings.updateBarbershop.execute(input),
      onSuccess: async () => {
        toast.success(ptBR.settings.shopSaved);
        await refresh();
      },
      onError: fail,
    }),
    updatePolicy: useMutation({
      mutationFn: (input: UpdateCancellationPolicyInput) =>
        settings.updateCancellationPolicy.execute(input),
      onSuccess: async () => {
        toast.success(ptBR.settings.policySaved);
        await refresh();
      },
      onError: fail,
    }),
  };
}
