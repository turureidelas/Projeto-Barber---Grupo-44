/** Every TanStack Query key in one place, so invalidation stays consistent. */
export const queryKeys = {
  session: ['session'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
};
