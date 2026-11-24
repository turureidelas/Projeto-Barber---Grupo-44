/** Every TanStack Query key in one place, so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  /** Public list (client sign-up). */
  barbershops: ['public', 'barbershops'] as const,
  clientProfile: ['client', 'profile'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
  /** Prefix of every catalog query — invalidate it after any cadastro change. */
  catalog: ['catalog'] as const,
  professionals: (includeInactive = false) =>
    ['catalog', 'professionals', includeInactive ? 'all' : 'active'] as const,
  professional: (id: string) => ['catalog', 'professional', id] as const,
  barbershop: ['catalog', 'barbershop'] as const,
  notifications: ['notifications'] as const,
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
  /** Under the agenda prefix: any appointment change refreshes the numbers. */
  report: (from: string, to: string) => ['agenda', 'report', from, to] as const,
  slots: (professionalId: string, serviceId: string, date: string, ignoreId: string | null) =>
    ['agenda', 'slots', professionalId, serviceId, date, ignoreId ?? 'none'] as const,
  /** Client area: under the agenda prefix, so any booking change refreshes them. */
  myAppointments: ['agenda', 'mine'] as const,
  clientSlots: (professionalId: string, serviceId: string, date: string, ignoreId: string | null) =>
    ['agenda', 'client-slots', professionalId, serviceId, date, ignoreId ?? 'none'] as const,
};
