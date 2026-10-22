export const guestPaths = {
  index: '/',
  welcome: '/welcome',
  signIn: '/sign-in',
  signUp: '/sign-up',
  // starter:demo-start
  // Starter overview alias (src/demo). Removed by `pnpm adopt --remove-demo`.
  demo: '/demo',
  // starter:demo-end
  // starter:gen guest-paths (`pnpm gen view --group guest` adds paths above)
} as const;

/**
 * Maintainer/AI note:
 * Flow paths live under the "flow" key so that fromPaths.ts helpers
 * (useFlowNav, useFlowProgress) can resolve step order automatically from
 * the URL. AppRouter routes any path starting with /flow/ through
 * CenterTransitionShell (LTR/RTL slide transitions).
 *
 * Step key order determines navigation order. Add steps in the order users
 * should experience them.
 */
export const flowPaths = {
  onboarding: {
    welcome: '/flow/onboarding/welcome',
    preferences: '/flow/onboarding/preferences',
    complete: '/flow/onboarding/complete',
  },
  // starter:gen flow-paths (`pnpm gen flow` adds flows above)
} as const;

export const userPaths = {
  dashboard: '/',
  // starter:reference-start
  // Resource reference feature. Removed by `pnpm adopt --remove-reference`.
  resources: '/resources',
  // starter:reference-end
  // starter:gen user-paths (`pnpm gen view --group user` adds paths above)
} as const;

export const paths = {
  ...guestPaths,
  flow: flowPaths,
  onboarding: flowPaths.onboarding,
  ...userPaths,
} as const;
