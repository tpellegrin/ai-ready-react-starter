import {
  Context,
  createContext,
  FC,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createBrowserRouter,
  type RouteObject,
  RouterProvider,
} from 'react-router-dom';

import { App } from 'containers/App';
import { RouteType, RouterType } from 'globals/types';
import { paths } from 'globals/paths';
import { GuestRoutes } from 'views/guest';
import { OnboardingRoutes } from 'views/onboarding';
import { UserRoutes } from 'views/user';
import { ErrorPage } from 'views/ErrorPage';

import { ContextProps } from './types';

const getRouter = (routes: RouteType[]) =>
  createBrowserRouter([
    {
      path: '/',
      Component: App,
      errorElement: <ErrorPage />,
      children: [
        ...routes.map<RouteObject>((route) => ({
          index: route.path === '/',
          path: route.path === '/' ? undefined : route.path,
          Component: route.Component,
          element: route.element,
          errorElement: <ErrorPage />,
        })),
        {
          path: '*',
          element: <ErrorPage />,
          errorElement: <ErrorPage />,
        },
      ],
    },
  ]);

export const guestRouter = getRouter(GuestRoutes);
export const onboardingRouter = getRouter(OnboardingRoutes);
export const userRouter = getRouter(UserRoutes);

export const RouterSwitcherContext: Context<ContextProps> =
  createContext<ContextProps>({
    routerType: RouterType.guest,
    setRouterType: () => {},
  });

export const RouterSwitcherProvider: FC = () => {
  const [isFirstRouterMount, setIsFirstRouterMount] = useState<boolean>(true);
  const initialRouterType = useMemo(() => RouterType.guest, []);
  const [routerType, setRouterType] = useState<RouterType>(initialRouterType);

  const value: ContextProps = useMemo(
    () => ({
      routerType,
      setRouterType,
    }),
    [routerType],
  );

  const router = useMemo(() => {
    switch (routerType) {
      case RouterType.guest:
        return guestRouter;
      case RouterType.onboarding:
        return onboardingRouter;
      case RouterType.user:
        return userRouter;
    }
  }, [routerType]);

  useEffect(() => {
    if (!isFirstRouterMount && router === guestRouter) {
      void guestRouter.navigate(paths.index);
    }
    setIsFirstRouterMount(false);
  }, [router, isFirstRouterMount]);

  return (
    <RouterSwitcherContext.Provider value={value}>
      <RouterProvider router={router} />
    </RouterSwitcherContext.Provider>
  );
};

export const useRouterSwitcher = (): ContextProps =>
  useContext(RouterSwitcherContext);
