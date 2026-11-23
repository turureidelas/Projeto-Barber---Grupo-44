import type { Clock } from '@application/ports/Clock';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ToastProvider } from '../components/ui/ToastProvider';
import { ClockContext } from './providers/ClockContext';

interface AppProvidersProps {
  readonly queryClient: QueryClient;
  /** Defaults to the system clock. */
  readonly clock?: Clock;
  readonly children: ReactNode;
}

/** Server-state cache + toast feedback. Use cases come from <UseCasesProvider> (composition root). */
export function AppProviders({ queryClient, clock, children }: AppProvidersProps) {
  const content = (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return clock ? <ClockContext value={clock}>{content}</ClockContext> : content;
}
