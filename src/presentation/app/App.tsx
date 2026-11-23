import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import { ErrorBoundary } from '../components/feedback/ErrorBoundary';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';
import { createQueryClient } from './query-client';

export function App() {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <ErrorBoundary>
      <AppProviders queryClient={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
