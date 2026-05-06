// DEMO: Replace or remove this file when adopting the boilerplate. See docs/adoption.md.
/**
 * Mock API for demonstration purposes.
 *
 * This exists to demonstrate React Query usage without a backend.
 * Production apps should replace these mocks with real fetch/axios calls.
 */

export interface AppStatus {
  status: string;
  version: string;
  uptime: number;
}

export const fetchAppStatus = async (): Promise<AppStatus> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    status: 'ok',
    version: '1.0.0-boilerplate',
    uptime: typeof process !== 'undefined' ? process.uptime?.() || 0 : 0,
  };
};
