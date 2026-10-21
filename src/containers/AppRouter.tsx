import { useEffect, useMemo, useRef } from 'react';
import {
  RouterProvider,
  createHashRouter,
  type Location,
} from 'react-router-dom';

import { useAuth } from 'auth/useAuth';
import { paths } from 'globals/paths';
import { RouterType } from 'globals/types';
import { runDetached } from 'utils/async';
import { AppLoading } from 'views/system/AppLoading';
import { SessionUnavailable } from 'views/system/SessionUnavailable';

import { buildRouteObjects } from './routing/buildRouteObjects';
import { routeTable } from './routing/routeTable';
import { UnknownRoute } from './routing/UnknownRoute';
import { createUnknownRoutePolicy } from './routing/unknownRoutePolicy';
import type { DataRouter, RouteTable, RouterFactory } from './routing/types';

/**
 * Router group for the current auth state. Derived during render, never
 * stored: views cannot "switch" routers, and a guest can never be handed the
 * onboarding or user route groups.
 */
export const deriveRouterType = ({
  isAuthenticated,
  user,
}: {
  isAuthenticated: boolean;
  user: { needsOnboarding?: boolean | undefined } | null;
}): RouterType => {
  if (!isAuthenticated) return RouterType.guest;
  return user?.needsOnboarding ? RouterType.onboarding : RouterType.user;
};

/** Production default: hash URLs (static hosting, GitHub Pages subpaths). */
export const hashRouterFactory: RouterFactory = (routes) =>
  createHashRouter(routes);

const currentHashPath = () => window.location.hash.replace(/^#/, '') || '/';

type AppRouterProps = {
  routes?: RouteTable | undefined;
  /** Inject a memory router in tests (see memoryRouterFactory in src/test/app.tsx). */
  createRouter?: RouterFactory | undefined;
  /** Starting path for memory routers; the hash router reads the URL. */
  initialPath?: string | undefined;
};

/**
 * AppRouter selects the Guest, Onboarding or User router from auth state.
 *
 * Maintainer/AI note:
 * Do not bypass these boundaries by adding protected routes to the Guest
 * router. Client routing is a UX boundary only; the server must authorize
 * every request.
 */
export const AppRouter = ({
  routes = routeTable,
  createRouter = hashRouterFactory,
  initialPath,
}: AppRouterProps) => {
  const { status, user, restoreSession } = useAuth();
  const routerType = deriveRouterType({
    isAuthenticated: status === 'authenticated',
    user,
  });

  // Where the previous router ended up, so the next one starts there.
  const lastPathRef = useRef(initialPath ?? currentHashPath());

  const router = useMemo(
    () =>
      createRouter(
        buildRouteObjects(
          routes[routerType],
          <UnknownRoute
            policy={createUnknownRoutePolicy(routerType, routes, paths.signIn)}
          />,
        ),
        { initialPath: lastPathRef.current },
      ),
    [createRouter, routes, routerType],
  );

  useEffect(() => {
    const remember = ({ pathname, search }: Location) => {
      lastPathRef.current = `${pathname}${search}`;
    };
    // Child effects (e.g. a <Navigate> redirect) run before this one, so
    // record where the router already is, then follow later navigations.
    remember(router.state.location);
    return router.subscribe(({ location }) => remember(location));
  }, [router]);

  // Dispose a router once it has been replaced, so it stops listening to
  // history events.
  const previousRouterRef = useRef<DataRouter | null>(null);
  useEffect(() => {
    const previous = previousRouterRef.current;
    if (previous && previous !== router) previous.dispose();
    previousRouterRef.current = router;
  }, [router]);

  if (status === 'initializing') return <AppLoading />;
  if (status === 'error') {
    return <SessionUnavailable onRetry={() => runDetached(restoreSession())} />;
  }

  // Keyed by group so swapping routers fully remounts the provider subtree.
  return <RouterProvider key={routerType} router={router} />;
};
