import { useEffect, useMemo } from 'react';
import {
  Navigate,
  RouterProvider,
  createHashRouter,
  createMemoryRouter,
} from 'react-router-dom';
import { useAuth } from 'auth/useAuth';
import { useNavigation } from 'globals/context/NavigationContext';
import { RouterType, RouteType } from 'globals/types';
import { GuestRoutes } from 'views/guest';
import { OnboardingRoutes } from 'views/onboarding';
import { UserRoutes } from 'views/user';
import { ErrorPage } from 'views/ErrorPage';
import { CenterTransitionShell } from 'containers/Layouts/Shells/CenterTransitionShell';
import { AnimatedOutlet } from 'components/AnimatedOutlet';

/**
 * Creates a router configuration for the given routes
 * - Non-flow routes: wrapped by AnimatedOutlet (fade-only route transitions)
 * - Flow routes (a path starts with "/flow/"): wrapped by CenterTransitionShell (center-only LTR/RTL)
 */
const getRouter = (routes: RouteType[], type: 'hash' | 'memory' = 'hash') => {
  const flowRoutes = routes.filter((r) => r.path?.startsWith('/flow/'));
  const nonFlowRoutes = routes.filter((r) => !r.path?.startsWith('/flow/'));

  // Map non-flow routes as children
  const nonFlowChildren = nonFlowRoutes.map((route) => ({
    index: route.path === '/',
    path: route.path === '/' ? undefined : route.path,
    Component: route.Component,
    element: route.element,
    ErrorBoundary: ErrorPage,
  }));

  // Map flow routes under /flow
  const flowChildren = flowRoutes.map((route) => {
    const relative = route.path.replace(/^\/(?:flow)\/?/, '');
    return {
      path: relative,
      Component: route.Component,
      element: route.element,
      ErrorBoundary: ErrorPage,
    };
  });

  // If a route group exposes only flow routes (no explicit `/`), add an index
  // redirect to the first flow step. This prevents the wildcard ErrorPage
  // fallback when a user enters the onboarding router from a URL like `/`.
  const hasIndex = nonFlowChildren.some((c) => c.index);
  if (!hasIndex && flowRoutes.length > 0) {
    nonFlowChildren.unshift({
      index: true,
      path: undefined,
      Component: undefined,
      element: <Navigate to={flowRoutes[0].path} replace />,
      ErrorBoundary: ErrorPage,
    });
  }

  const config = [
    {
      path: '/',
      Component: AnimatedOutlet,
      ErrorBoundary: ErrorPage,
      children: [
        ...nonFlowChildren,
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
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ];

  return type === 'hash'
    ? createHashRouter(config)
    : createMemoryRouter(config);
};

/**
 * AppRouter handles the high-level routing state of the application.
 *
 * Maintainer/AI note:
 * This component switches between different router configurations (Guest, Onboarding, User)
 * based on the authentication and initialization state.
 *
 * Do not bypass these boundaries by adding protected routes to the Guest router.
 */
export const AppRouter = () => {
  const { routerType, setRouterType } = useNavigation();
  const { isAuthenticated, isInitialized, user } = useAuth();

  // Create the appropriate router based on the current router type
  const router = useMemo(() => {
    const type =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
        ? 'memory'
        : 'hash';

    switch (routerType) {
      case RouterType.guest:
        // The DemoHub view (a demo gateway shipped with the boilerplate) links
        // to the onboarding flow without going through auth. Including the
        // onboarding routes here keeps that demo entry reachable while preserving
        // the auth-gated routerType switch in production usage.
        return getRouter([...GuestRoutes, ...OnboardingRoutes], type);
      case RouterType.onboarding:
        return getRouter(OnboardingRoutes, type);
      case RouterType.user:
        return getRouter(UserRoutes, type);
    }
  }, [routerType]);

  // Set router type based on auth state
  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      if (user?.needsOnboarding) {
        setRouterType(RouterType.onboarding);
      } else {
        setRouterType(RouterType.user);
      }
    } else {
      setRouterType(RouterType.guest);
    }
  }, [isAuthenticated, isInitialized, setRouterType, user?.needsOnboarding]);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  // Use `routerType` as a React key so swapping the router instance fully
  // remounts the RouterProvider subtree. Without this, react-router's internal
  // state from the previous router (e.g. an in-flight Navigate redirect) can
  // leak into the new router and cause the wildcard route to match an
  // unexpected path, surfacing as the ErrorPage "Something went wrong".
  return <RouterProvider key={routerType} router={router} />;
};
