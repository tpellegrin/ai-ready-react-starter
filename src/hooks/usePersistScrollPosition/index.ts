import { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { paths } from 'globals/paths';
import { useScrollRef } from 'globals/context/ScrollContext';

const POSITION_TTL_MS = 1000 * 60 * 60;

const isWithinTTL = (timestamp: number) => {
  return Date.now() - timestamp < POSITION_TTL_MS;
};

/**
 * Routes that should preserve scroll position when navigating away and back
 * These are typically routes with scrollable content like lists or long pages
 */
const LOCATIONS_TO_PERSIST: string[] = [
  // Main routes
  paths.index,
];

type ScrollPosition = {
  left: number;
  top: number;
  timestamp: number;
};

const SCROLL_POSITIONS: Record<string, ScrollPosition> = {};

export const usePersistScrollPosition = () => {
  const location = useLocation();
  const mainRef = useScrollRef();

  useEffect(() => {
    return () => {
      const { current } = mainRef ?? {};
      if (!current) return;
      if (!LOCATIONS_TO_PERSIST.includes(location.pathname)) return;
      SCROLL_POSITIONS[location.pathname] = {
        left: current.scrollLeft,
        top: current.scrollTop,
        timestamp: Date.now(),
      };
    };
  }, [mainRef, location.pathname]);

  const restoreScrollPosition = useCallback(
    (pathname: string) => {
      const scrollPosition = SCROLL_POSITIONS[pathname];

      if (!scrollPosition || !mainRef?.current) return;

      if (isWithinTTL(scrollPosition.timestamp)) {
        mainRef.current.scrollTo({
          left: scrollPosition.left,
          top: scrollPosition.top,
          behavior: 'instant',
        });
      }
    },
    [mainRef],
  );

  return useMemo(
    () => ({
      mainRef,
      restoreScrollPosition,
    }),
    [mainRef, restoreScrollPosition],
  );
};
