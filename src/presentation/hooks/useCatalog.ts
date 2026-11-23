import type {
  CreateClientInput,
  ProfessionalInput,
  ServiceInput,
  SetActiveInput,
  UpdateClientInput,
  UpdateProfessionalInput,
  UpdateServiceInput,
  UpdateWorkScheduleInput,
} from '@application/use-cases';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { errorMessage } from '../i18n/errors';
import { ptBR } from '../i18n/pt-BR';
import { queryKeys } from './query-keys';
import { useToast } from './useToast';
import { useUseCases } from './useUseCases';

const CATALOG_STALE_MS = 5 * 60_000;

/** Professionals (active only, unless asked) — for filters, pickers and the team page. */
export function useProfessionals(options: { enabled?: boolean; includeInactive?: boolean } = {}) {
  const { catalog } = useUseCases();
  const includeInactive = options.includeInactive ?? false;
  return useQuery({
    queryKey: queryKeys.professionals(includeInactive),
    queryFn: () => catalog.listProfessionals.execute({ includeInactive }),
    staleTime: CATALOG_STALE_MS,
    enabled: options.enabled ?? true,
  });
}

/** One professional with commission and weekly hours (owner only). */
export function useProfessional(professionalId: string) {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.professional(professionalId),
    queryFn: () => catalog.getProfessional.execute({ professionalId }),
  });
}

/** Services and combos (active only, unless asked). */
export function useServices(options: { includeInactive?: boolean } = {}) {
  const { catalog } = useUseCases();
  const includeInactive = options.includeInactive ?? false;
  return useQuery({
    queryKey: queryKeys.services(includeInactive),
    queryFn: () => catalog.listServices.execute({ includeInactive }),
    staleTime: CATALOG_STALE_MS,
  });
}

/** Client search while typing (debounced so we don't query on every key). */
export function useClientSearch(
  query: string,
  options: { enabled?: boolean; limit?: number } = {},
) {
  const { catalog } = useUseCases();
  const debounced = useDebouncedValue(query.trim(), 250);
  const limit = options.limit ?? 8;
  return useQuery({
    queryKey: queryKeys.clientSearch(debounced, limit),
    queryFn: () => catalog.searchClients.execute({ query: debounced, limit }),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useClientDetails(clientId: string) {
  const { catalog } = useUseCases();
  return useQuery({
    queryKey: queryKeys.clientDetails(clientId),
    queryFn: () => catalog.getClientDetails.execute({ clientId }),
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

const t = ptBR.catalog;

/** Every cadastro change: toast + refresh of catalog and agenda (names/prices show up there). */
export function useCatalogMutations() {
  const { catalog } = useUseCases();
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
      queryClient.invalidateQueries({ queryKey: queryKeys.agenda }),
    ]);
  };
  const fail = (error: unknown) => {
    toast.error(errorMessage(error));
  };
  const saved = async () => {
    toast.success(t.saved);
    await refresh();
  };
  const toggled = async (dto: { name: string; active: boolean }) => {
    toast.success(dto.active ? t.activated(dto.name) : t.deactivated(dto.name));
    await refresh();
  };

  return {
    createService: useMutation({
      mutationFn: (input: ServiceInput) => catalog.createService.execute(input),
      onSuccess: async (service) => {
        toast.success(ptBR.services.created(service.name));
        await refresh();
      },
      onError: fail,
    }),
    updateService: useMutation({
      mutationFn: (input: UpdateServiceInput) => catalog.updateService.execute(input),
      onSuccess: saved,
      onError: fail,
    }),
    setServiceActive: useMutation({
      mutationFn: (input: SetActiveInput) => catalog.setServiceActive.execute(input),
      onSuccess: toggled,
      onError: fail,
    }),
    createProfessional: useMutation({
      mutationFn: (input: ProfessionalInput) => catalog.createProfessional.execute(input),
      onSuccess: async (professional) => {
        toast.success(ptBR.team.created(professional.name));
        await refresh();
      },
      onError: fail,
    }),
    updateProfessional: useMutation({
      mutationFn: (input: UpdateProfessionalInput) => catalog.updateProfessional.execute(input),
      onSuccess: saved,
      onError: fail,
    }),
    updateWorkSchedule: useMutation({
      mutationFn: (input: UpdateWorkScheduleInput) => catalog.updateWorkSchedule.execute(input),
      onSuccess: async (professional) => {
        toast.success(ptBR.team.scheduleSaved(professional.name));
        await refresh();
      },
      onError: fail,
    }),
    setProfessionalActive: useMutation({
      mutationFn: (input: SetActiveInput) => catalog.setProfessionalActive.execute(input),
      onSuccess: toggled,
      onError: fail,
    }),
    createClient: useMutation({
      mutationFn: (input: CreateClientInput) => catalog.createClient.execute(input),
      onSuccess: async (client) => {
        toast.success(ptBR.clients.created(client.name));
        await refresh();
      },
      onError: fail,
    }),
    updateClient: useMutation({
      mutationFn: (input: UpdateClientInput) => catalog.updateClient.execute(input),
      onSuccess: saved,
      onError: fail,
    }),
    anonymizeClient: useMutation({
      mutationFn: (clientId: string) => catalog.anonymizeClient.execute({ clientId }),
      onSuccess: async (result) => {
        toast.success(ptBR.clients.anonymized(result.cancelledAppointments));
        await refresh();
      },
      onError: fail,
    }),
  };
}

export type CatalogMutations = ReturnType<typeof useCatalogMutations>;
