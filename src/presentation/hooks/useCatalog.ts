import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useUseCases } from './useUseCases';

/** Active professionals (for filters and pickers). */
export function useProfessionals(options: { enabled?: boolean } = {}) {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.professionals,
    queryFn: () => catalog.listProfessionals.execute({}),
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}
