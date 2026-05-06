/**
 * Centralized query keys for React Query.
 * Using a constant object ensures consistency and avoids typos.
 */
export const queryKeys = {
  appStatus: ['appStatus'] as const,
  // Add more keys here as the application grows
} as const;
