/** Every TanStack Query key in one place, so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
  /** Prefix of every catalog query — invalidate it after any cadastro change. */
  catalog: ['catalog'] as const,
  professionals: (includeInactive = false) =>
    ['catalog', 'professionals', includeInactive ? 'all' : 'active'] as const,
  professional: (id: string) => ['catalog', 'professional', id] as const,
  services: (includeInactive = false) =>
    ['catalog', 'services', includeInactive ? 'all' : 'active'] as const,
  clientSearch: (query: string, limit: number) => ['catalog', 'clients', query, limit] as const,
  clientDetails: (id: string) => ['catalog', 'client', id] as const,
  /** Prefix of every agenda query — invalidate it after any appointment or block change. */
  agenda: ['agenda'] as const,
  dailyAgenda: (date: string, professionalId: string | null) =>
    ['agenda', 'daily', date, professionalId ?? 'all'] as const,
  weeklyAgenda: (startDate: string, professionalId: string) =>
    ['agenda', 'weekly', startDate, professionalId] as const,
  slots: (professionalId: string, serviceId: string, date: string, ignoreId: string | null) =>
    ['agenda', 'slots', professionalId, serviceId, date, ignoreId ?? 'none'] as const,
};
