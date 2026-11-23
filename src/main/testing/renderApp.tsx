import { AppProviders } from '@presentation/app/AppProviders';
import { AppRoutes } from '@presentation/app/AppRoutes';
import { createQueryClient } from '@presentation/app/query-client';
import { UseCasesProvider } from '@presentation/app/providers/UseCasesProvider';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { createTestApp, type Persona, type TestApp } from './createTestApp';

export interface RenderAppOptions {
  /** Initial URL. */
  readonly route?: string;
  readonly app?: TestApp;
  /** Sign in before rendering. */
  readonly as?: Persona;
}

/** Renders the whole UI (routes, guards, layout) on the real use cases with in-memory data. */
export async function renderApp(options: RenderAppOptions = {}) {
  const app = options.app ?? createTestApp();
  if (options.as) {
    await app.signInAs(options.as);
  }
  const queryClient = createQueryClient({ retry: false });
  const user = userEvent.setup();
  const view = render(
    <UseCasesProvider useCases={app.useCases}>
      <AppProviders queryClient={queryClient} clock={app.clock}>
        <MemoryRouter initialEntries={[options.route ?? '/']}>
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>
    </UseCasesProvider>,
  );
  return { ...view, app, user, queryClient };
}
