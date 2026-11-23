import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from './query-keys';
import { useUseCases } from './useUseCases';

const CATALOG_STALE_MS = 5 * 60_000;

/** Active professionals (for filters and pickers). */
export function useProfessionals(options: { enabled?: boolean } = {}) {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.professionals,
    queryFn: () => catalog.listProfessionals.execute({}),
    staleTime: CATALOG_STALE_MS,
    enabled: options.enabled ?? true,
  });
}

/** Active services and combos. */
export function useServices() {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.services,
    queryFn: () => catalog.listServices.execute({}),
    staleTime: CATALOG_STALE_MS,
  });
}

/** Client search while typing (debounced so we don't query on every key). */
export function useClientSearch(query: string, enabled: boolean) {
  const { catalog } = useUseCases();
  const debounced = useDebouncedValue(query.trim(), 250);
  return useQuery({
    queryKey: queryKeys.clientSearch(debounced),
    queryFn: () => catalog.searchClients.execute({ query: debounced, limit: 8 }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      clearTimeout(id);
    };
  }, [value, delayMs]);
  return debounced;
}
