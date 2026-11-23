import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
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
