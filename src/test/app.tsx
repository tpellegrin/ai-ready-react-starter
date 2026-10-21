import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';

import type { AuthAdapter } from 'auth/types';
import { App } from 'containers/App';
import type { RouteTable, RouterFactory } from 'containers/routing/types';

export type { RouteTable } from 'containers/routing/types';

import { createFakeAuthAdapter } from './auth';
import { createTestQueryClient } from './utils';

/** Memory router that starts where the previous router group ended. */
export const memoryRouterFactory: RouterFactory = (routes, { initialPath }) =>
  createMemoryRouter(routes, { initialEntries: [initialPath] });

/**
 * Renders the real App shell (providers, AppRouter, transitions) with
 * injected dependencies and a memory router.
 */
export const renderApp = ({
  adapter = createFakeAuthAdapter(),
  initialPath = '/',
  routes,
  queryClient = createTestQueryClient(),
}: {
  adapter?: AuthAdapter;
  initialPath?: string;
  routes?: RouteTable;
  queryClient?: ReturnType<typeof createTestQueryClient>;
} = {}) => {
  const utils = render(
    <App
      authAdapter={adapter}
      queryClient={queryClient}
      routes={routes}
      createRouter={memoryRouterFactory}
      initialPath={initialPath}
    />,
  );
  return { ...utils, adapter, queryClient };
};
