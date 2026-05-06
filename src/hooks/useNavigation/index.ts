import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useNavigation as useNavigationContext } from 'globals/context/NavigationContext';
import { RouterType } from 'globals/types';
import { paths } from 'globals/paths';

/**
 * A comprehensive hook for navigation-related functionality
 * Provides methods for navigating between routes and switching router types
 */
export const useNavigation = () => {
  const { routerType, setRouterType, transition } = useNavigationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const switchRouter = useCallback(
    (type: RouterType, initialPath?: string) => {
      setRouterType(type);
      if (initialPath) {
        void navigate(initialPath);
      } else {
        switch (type) {
          case RouterType.guest:
            void navigate(paths.index);
            break;
          case RouterType.onboarding:
            void navigate(paths.onboarding.welcome);
            break;
          case RouterType.user:
            void navigate(paths.dashboard);
            break;
        }
      }
    },
    [setRouterType, navigate],
  );

  return {
    currentPath: location.pathname,
    routerType,
    transition,
    navigate,
    switchRouter,
    isGuestRouter: routerType === RouterType.guest,
    isUserRouter: routerType === RouterType.user,
    isOnboardingRouter: routerType === RouterType.onboarding,
  };
};
