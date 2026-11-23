import '@presentation/styles/index.css';

import { createBrowserStorage } from '@infrastructure/storage/KeyValueStorage';
import { App } from '@presentation/app/App';
import { UseCasesProvider } from '@presentation/app/providers/UseCasesProvider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { env } from './config/env';
import { createContainer } from './container';

const MOCK_LATENCY_MS = 150;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html.');
}

const { useCases, dependencies } = createContainer({
  env,
  storage: createBrowserStorage(),
  mockLatencyMs: MOCK_LATENCY_MS,
});

createRoot(rootElement).render(
  <StrictMode>
    <UseCasesProvider useCases={useCases}>
      <App clock={dependencies.clock} />
    </UseCasesProvider>
  </StrictMode>,
);
