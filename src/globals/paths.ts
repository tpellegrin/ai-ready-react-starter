export const guestPaths = {
  index: '/',
  welcome: '/welcome',
  signIn: '/sign-in',
  signUp: '/sign-up',
  // DEMO: starter overview route, safe to remove. See docs/adoption.md.
  demo: '/demo',
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
} as const;

export const userPaths = { dashboard: '/' } as const;

export const paths = {
  ...guestPaths,
  flow: flowPaths,
  onboarding: flowPaths.onboarding,
  ...userPaths,
} as const;
