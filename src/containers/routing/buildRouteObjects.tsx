import type { ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import { CenterTransitionShell } from 'containers/Layouts/Shells/CenterTransitionShell';
import { AnimatedOutlet } from 'containers/RouteTransitions/AnimatedOutlet';
import type { RouteType } from 'globals/types';
import { ErrorPage } from 'views/system/ErrorPage';
import { AppLoading } from 'views/system/AppLoading';

const FLOW_PREFIX = '/flow/';

/**
 * A lazy route gets its error boundary from the loaded module, not as a
 * static property: if the import itself fails on the first load (e.g. a
 * deploy removed the chunk), React Router keeps showing HydrateFallback when
 * the failing route owns the boundary. Without one, the parent boundary
 * renders ErrorPage (with its "reload" action for outdated chunks).
 */
const withErrorBoundary =
  (lazy: NonNullable<RouteType['lazy']>) => async () => ({
    ...(await lazy()),
    ErrorBoundary: ErrorPage,
  });

const toRouteObject = (
  route: RouteType,
  at: { index: true } | { path: string },
): RouteObject => {
  const content = route.lazy
    ? { lazy: withErrorBoundary(route.lazy) }
    : {
        ...(route.Component
          ? { Component: route.Component }
          : { element: route.element }),
        ErrorBoundary: ErrorPage,
      };
  return 'index' in at
    ? { index: true, ...content }
    : { path: at.path, ...content };
};

/**
 * Builds the React Router tree for one route group:
 * - Non-flow routes render inside AnimatedOutlet (fade transitions).
 * - Routes under /flow/ render inside CenterTransitionShell (LTR/RTL slides).
 * - A group without "/" gets an index redirect to its first flow step.
 * - `unknownRoute` renders for any path the group does not define.
 */
export const buildRouteObjects = (
  routes: readonly RouteType[],
  unknownRoute: ReactNode,
): RouteObject[] => {
  const flowRoutes = routes.filter((r) => r.path.startsWith(FLOW_PREFIX));
  const pageRoutes = routes.filter((r) => !r.path.startsWith(FLOW_PREFIX));

  const pageChildren: RouteObject[] = pageRoutes.map((route) =>
    toRouteObject(
      route,
      route.path === '/' ? { index: true } : { path: route.path },
    ),
  );

  const firstFlowPath = flowRoutes[0]?.path;
  if (!pageRoutes.some((route) => route.path === '/') && firstFlowPath) {
    pageChildren.unshift({
      index: true,
      element: <Navigate to={firstFlowPath} replace />,
      ErrorBoundary: ErrorPage,
    });
  }

  const flowChildren: RouteObject[] = flowRoutes.map((route) =>
    toRouteObject(route, { path: route.path.slice(FLOW_PREFIX.length) }),
  );

  return [
    {
      path: '/',
      Component: AnimatedOutlet,
      ErrorBoundary: ErrorPage,
      // Shown while a lazy route needed for the first render is loading.
      HydrateFallback: AppLoading,
      children: [
        ...pageChildren,
        ...(flowChildren.length
          ? [
              {
                path: 'flow',
                Component: CenterTransitionShell,
                ErrorBoundary: ErrorPage,
                children: flowChildren,
              },
            ]
          : []),
        { path: '*', element: unknownRoute },
      ],
    },
  ];
};
