/** Every TanStack Query key in one place, so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
  professionals: ['catalog', 'professionals'] as const,
  /** Prefix of every agenda query — invalidate it after any appointment change. */
  agenda: ['agenda'] as const,
  dailyAgenda: (date: string, professionalId: string | null) =>
    ['agenda', 'daily', date, professionalId ?? 'all'] as const,
};
