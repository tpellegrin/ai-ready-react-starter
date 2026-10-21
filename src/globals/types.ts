import type { ComponentType, ReactNode } from 'react';

/** Router groups selected by app state (see containers/AppRouter.tsx). */
export const RouterType = {
  guest: 'guest',
  onboarding: 'onboarding',
  user: 'user',
} as const;
export type RouterType = (typeof RouterType)[keyof typeof RouterType];

/**
 * A route in a group. Use `lazy` to code-split a route: the module loads
 * before the navigation commits, so route transitions are unaffected.
 */
export type RouteType = { path: string } & (
  | { Component: ComponentType; element?: never; lazy?: never }
  | { element: ReactNode; Component?: never; lazy?: never }
  | {
      lazy: () => Promise<{ Component: ComponentType }>;
      Component?: never;
      element?: never;
    }
);
