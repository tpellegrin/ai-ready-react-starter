import type { createHashRouter, RouteObject } from 'react-router-dom';

import type { RouterType, RouteType } from 'globals/types';

export type DataRouter = ReturnType<typeof createHashRouter>;

/** Route groups per app state. Composed in routing/routeTable.ts. */
export type RouteTable = Record<RouterType, RouteType[]>;

/**
 * Creates the router for one route group. `initialPath` is the location the
 * previous router ended on: memory routers (tests) start there; the hash
 * router ignores it because window.location is already the source of truth.
 */
export type RouterFactory = (
  routes: RouteObject[],
  options: { initialPath: string },
) => DataRouter;
