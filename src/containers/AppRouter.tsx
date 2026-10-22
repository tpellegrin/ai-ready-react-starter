import { useEffect, useRef, useState } from 'react';
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
import { nextRouterSession, type RouterSession } from './routing/routerSession';
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

const currentHashPath = () => window.location.hash.replace(/^#/, '') || '/';

/**
 * Production default: hash URLs (static hosting, GitHub Pages subpaths). The
 * router reads window.location, so a start path that differs from the URL (a
 * destination kept through onboarding) is applied to the URL first.
 */
export const hashRouterFactory: RouterFactory = (routes, { initialPath }) => {
  if (currentHashPath() !== initialPath) {
    window.history.replaceState(null, '', `#${initialPath}`);
  }
  return createHashRouter(routes);
};

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
 * - Nothing is routed until the session is known: while restoring it shows
 *   AppLoading, after a failed start SessionUnavailable (retry). A retry
 *   keeps the current router instead of swapping groups.
 * - When the group changes, the next router starts where the previous one
 *   ended, and a destination behind required onboarding is kept for the user
 *   group (routing/routerSession.ts, docs/routing.md).
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
  const { status, user, error, restoreSession } = useAuth();
  const routerType = deriveRouterType({
    isAuthenticated: status === 'authenticated',
    user,
  });
  const isSettled = status === 'authenticated' || status === 'unauthenticated';

  // Where the current router is, so the next one can start there.
  const lastPathRef = useRef(initialPath ?? currentHashPath());
  const [session, setSession] = useState<RouterSession>(() => ({
    group: null,
    startPath: lastPathRef.current,
    pendingDestination: null,
  }));
  let current = session;
  if (isSettled && session.group !== routerType) {
    // Adjusting state during render (React's pattern for deriving from
    // changed inputs): pure, so Strict Mode's double render is harmless.
    current = nextRouterSession(
      session,
      routerType,
      lastPathRef.current,
      routes,
    );
    setSession(current);
  }

  // One router per group swap, created lazily during render and keyed by
  // value: Strict Mode renders twice (and runs useMemo twice), which would
  // otherwise leave a second hash router listening to history.
  const routerRef = useRef<{
    key: string;
    routes: RouteTable;
    createRouter: RouterFactory;
    router: DataRouter;
  } | null>(null);
  const group = current.group;
  const routerKey = `${group ?? ''}\n${current.startPath}`;
  if (
    group !== null &&
    (routerRef.current?.key !== routerKey ||
      routerRef.current.routes !== routes ||
      routerRef.current.createRouter !== createRouter)
  ) {
    routerRef.current = {
      key: routerKey,
      routes,
      createRouter,
      router: createRouter(
        buildRouteObjects(
          routes[group],
          <UnknownRoute
            policy={createUnknownRoutePolicy(group, routes, paths.signIn)}
          />,
        ),
        { initialPath: current.startPath },
      ),
    };
  }
  const router = group === null ? null : (routerRef.current?.router ?? null);

  useEffect(() => {
    if (!router) return;
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

  if (status === 'error') {
    return (
      <SessionUnavailable
        error={error}
        onRetry={() => runDetached(restoreSession())}
      />
    );
  }
  if (!isSettled || !router) return <AppLoading />;

  // Keyed by group so swapping routers fully remounts the provider subtree.
  return <RouterProvider key={group} router={router} />;
};
