/** Every TanStack Query key in one place, so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
  professionals: ['catalog', 'professionals'] as const,
  services: ['catalog', 'services'] as const,
  clientSearch: (query: string) => ['catalog', 'clients', query] as const,
  /** Prefix of every agenda query — invalidate it after any appointment or block change. */
  agenda: ['agenda'] as const,
  dailyAgenda: (date: string, professionalId: string | null) =>
    ['agenda', 'daily', date, professionalId ?? 'all'] as const,
  weeklyAgenda: (startDate: string, professionalId: string) =>
    ['agenda', 'weekly', startDate, professionalId] as const,
  slots: (professionalId: string, serviceId: string, date: string, ignoreId: string | null) =>
    ['agenda', 'slots', professionalId, serviceId, date, ignoreId ?? 'none'] as const,
};
