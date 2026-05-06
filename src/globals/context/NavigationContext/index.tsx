import React, {
  createContext,
  FC,
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';

import { RouterType } from 'globals/types';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';

type NavigationContextProps = {
  routerType: RouterType;
  setRouterType: (type: RouterType) => void;
  transition: TransitionType | null;
  setTransition: (t: TransitionType | null) => void;
  scrollRef: React.RefObject<HTMLElement | null>;
  navEpoch: number;
  registerNavigationCommit: (locationKey: string) => void;
  // One-shot pending transition to reflect user intent on the next navigation
  nextTransitionRef: React.MutableRefObject<TransitionType | null>;
  setNextTransitionIntent: (t: TransitionType | null) => void;
  // Global navigation lock API
  isNavBlocked: boolean;
  tryAcquireNavLock: (ms: number) => boolean;
  blockNavigation: (ms: number) => void;
  clearNavigationBlock: () => void;
};

const NavigationContext = createContext<NavigationContextProps>({
  routerType: RouterType.guest,
  setRouterType: () => {},
  transition: null,
  setTransition: () => {},
  scrollRef: { current: null } as React.RefObject<HTMLElement | null>,
  navEpoch: 0,
  registerNavigationCommit: () => {},
  nextTransitionRef: {
    current: null,
  } as React.MutableRefObject<TransitionType | null>,
  setNextTransitionIntent: () => {},
  // Defaults for nav lock
  isNavBlocked: false,
  tryAcquireNavLock: () => true,
  blockNavigation: () => {},
  clearNavigationBlock: () => {},
});

export const NavigationProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [routerType, setRouterType] = useState<RouterType>(RouterType.guest);
  const [transition, setTransition] = useState<TransitionType | null>(null);
  const [navEpoch, setNavEpoch] = useState(0);
  const scrollRef = useRef<HTMLElement>(null);
  const nextTransitionRef = useRef<TransitionType | null>(null);
  const lastCommittedLocationKeyRef = useRef<string | null>(null);
  const setNextTransitionIntent = (t: TransitionType | null) => {
    nextTransitionRef.current = t;
  };

  const registerNavigationCommit = React.useCallback((locationKey: string) => {
    if (!locationKey) return;
    if (lastCommittedLocationKeyRef.current === locationKey) return;
    lastCommittedLocationKeyRef.current = locationKey;
    setNavEpoch((prev) => prev + 1);
  }, []);

  // Global, time-based navigation lock
  const [isNavBlocked, setIsNavBlocked] = useState(false);
  const unblockTimerRef = useRef<number | null>(null);
  const lockedUntilRef = useRef<number>(0);

  const clearUnblockTimer = () => {
    if (unblockTimerRef.current) {
      window.clearTimeout(unblockTimerRef.current);
      unblockTimerRef.current = null;
    }
  };

  const scheduleUnblockCheck = React.useCallback(() => {
    clearUnblockTimer();
    const remaining = lockedUntilRef.current - Date.now();
    if (remaining <= 0) {
      setIsNavBlocked(false);
      return;
    }
    unblockTimerRef.current = window.setTimeout(
      () => {
        const stillRemaining = lockedUntilRef.current - Date.now();
        if (stillRemaining <= 0) {
          setIsNavBlocked(false);
          unblockTimerRef.current = null;
        } else {
          // Lock was extended; reschedule
          scheduleUnblockCheck();
        }
      },
      Math.min(remaining, 2147483647),
    );
  }, []);

  const blockNavigation = React.useCallback(
    (ms: number) => {
      if (ms <= 0) return;
      const until = Date.now() + ms;
      // Extend the lock window if needed
      if (until > lockedUntilRef.current) lockedUntilRef.current = until;
      // Ensure blocked state and schedule the proper unblock
      setIsNavBlocked(true);
      scheduleUnblockCheck();
    },
    [scheduleUnblockCheck],
  );

  const clearNavigationBlock = React.useCallback(() => {
    lockedUntilRef.current = 0;
    clearUnblockTimer();
    setIsNavBlocked(false);
  }, []);

  const tryAcquireNavLock = React.useCallback(
    (ms: number) => {
      const now = Date.now();
      if (now < lockedUntilRef.current) return false;
      blockNavigation(ms);
      return true;
    },
    [blockNavigation],
  );

  useEffect(() => () => clearUnblockTimer(), []);

  const value = useMemo(
    () => ({
      routerType,
      setRouterType,
      transition,
      setTransition,
      scrollRef,
      navEpoch,
      registerNavigationCommit,
      nextTransitionRef,
      setNextTransitionIntent,
      // Nav lock
      isNavBlocked,
      tryAcquireNavLock,
      blockNavigation,
      clearNavigationBlock,
    }),
    [
      routerType,
      transition,
      navEpoch,
      registerNavigationCommit,
      isNavBlocked,
      tryAcquireNavLock,
      blockNavigation,
      clearNavigationBlock,
    ],
  );

  // Dev guard: ensure the global motion clamp root (.app-root) exists
  useEffect(() => {
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const root = document.querySelector('.app-root');
      if (!root) {
        // eslint-disable-next-line no-console
        console.warn(
          '[GlobalStyles] .app-root element not found. Global transition clamp may not apply. Ensure your app root has class="app-root".',
        );
      }
    }
  }, []);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
