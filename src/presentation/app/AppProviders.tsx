import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastProvider } from '../components/ui/ToastProvider';

interface AppProvidersProps {
  readonly queryClient: QueryClient;
  readonly children: ReactNode;
}

/** Server-state cache + toast feedback. Use cases come from <UseCasesProvider> (composition root). */
export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
