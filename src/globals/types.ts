import { ComponentType, ReactNode } from 'react';

/**
 * Enum for different router types in the application
 */
export enum RouterType {
  guest,
  user,
  onboarding,
}

export type RouteType = {
  path: string;
  Component?: ComponentType;
  element?: ReactNode;
} & (
  | {
      Component?: never;
      element: ReactNode;
    }
  | {
      Component: ComponentType;
      element?: never;
    }
);
