import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page, type Route } from '@playwright/test';

/**
 * Routing uses hash URLs, so every in-app path is `<base>#<path>`. Relative
 * navigation keeps the configured base path (root or sub-path).
 */
export const gotoApp = (page: Page, path = '/') =>
  page.goto(path === '/' ? './' : `./#${path}`);

export const currentAppPath = (page: Page) =>
  new URL(page.url()).hash.replace(/^#/, '') || '/';

/**
 * Resolves once the page's motion has finished: two frames first (motion
 * started on mount), then every running animation or transition that has
 * an end, again until none are left (a reveal can start another).
 * Infinite ones (spinners) and paused ones are not waited for.
 */
export const settleMotion = (page: Page) =>
  page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    for (let round = 0; round < 10; round += 1) {
      const running = document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getComputedTiming().endTime !== Infinity,
        );
      if (!running.length) return;
      await Promise.all(
        running.map((animation) => animation.finished.catch(() => undefined)),
      );
    }
  });

/**
 * WCAG 2.2 A/AA plus axe best practices; any violation fails the test.
 * Measured once motion has settled: mid-fade text fails contrast.
 */
export const expectNoA11yViolations = async (page: Page) => {
  await settleMotion(page);
  const results = await new AxeBuilder({ page })
    .withTags([
      'wcag2a',
      'wcag2aa',
      'wcag21a',
      'wcag21aa',
      'wcag22aa',
      'best-practice',
    ])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}\n    ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join('\n    ')}`,
  );
  // The ids lead the message: `pnpm verify` reports its first line.
  expect(
    summary,
    `accessibility violations: ${results.violations.map((v) => v.id).join(', ')}`,
  ).toEqual([]);
};

/**
 * Engine notices about deliberate markup, logged as errors on every page.
 * Exact messages only: anything else still fails the test.
 * - `interactive-widget` (index.html viewport): Chromium and Firefox on
 *   Android resize the layout for the on-screen keyboard with it; WebKit
 *   (Linux builds, iOS Safari) does not support it and says so.
 */
const ENGINE_NOTICES = [
  /^Viewport argument key "interactive-widget" not recognized and ignored\.$/,
];

/**
 * Every test fails on uncaught page errors and console errors, so runtime
 * problems cannot hide behind a passing assertion. Tests that provoke HTTP
 * errors on purpose allow Chromium's matching "Failed to load resource" logs
 * with `test.use({ allowedConsoleErrors: [...] })`.
 */
export const test = base.extend<{
  allowedConsoleErrors: RegExp[];
  consoleErrors: string[];
}>({
  allowedConsoleErrors: [[], { option: true }],
  consoleErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) =>
        errors.push(`pageerror: ${error.message}`),
      );
      page.on('console', (message) => {
        const text = message.text();
        if (
          message.type() === 'error' &&
          ![...ENGINE_NOTICES, ...allowedConsoleErrors].some((pattern) =>
            pattern.test(text),
          )
        ) {
          errors.push(`console: ${text}`);
        }
      });
      await use(errors);
      // The messages lead: `pnpm verify` reports the first line.
      expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
    },
    { auto: true },
  ],
});

/** Demo builds only: sign in through storage once per test (skips the UI). */
export const seedDemoSession = (
  page: Page,
  { email = 'e2e@example.com', needsOnboarding = false } = {},
) =>
  page.addInitScript(
    ({ email, needsOnboarding }) => {
      // Init scripts also run in about:blank, where storage is not available.
      if (location.protocol === 'about:') return;
      if (sessionStorage.getItem('e2e.seeded')) return;
      sessionStorage.setItem('e2e.seeded', '1');
      localStorage.setItem(
        'starter.demo.session',
        JSON.stringify({
          id: `demo:${email}`,
          email,
          name: 'Demo User',
          needsOnboarding,
        }),
      );
      if (!needsOnboarding) {
        localStorage.setItem('starter.demo.onboarded', JSON.stringify([email]));
      }
    },
    { email, needsOnboarding },
  );

/**
 * Flow steps ignore navigation while their slide transition runs (a
 * deliberate double-advance guard); wait until the layout reports it done.
 */
export const waitForRouteTransition = (page: Page) =>
  expect(page.locator('[data-transitioning]')).toHaveCount(0);

/** A toast by its text (Radix also renders a hidden copy for announcements). */
export const toast = (page: Page, text: string) =>
  page.getByRole('region', { name: /Notifications/ }).getByText(text);

/** Demo builds only: make the next request to a mock endpoint fail (500). */
export const injectMockFault = (page: Page, fault: string) =>
  page.evaluate((name) => {
    const current = sessionStorage.getItem('starter.mocks.faults');
    sessionStorage.setItem(
      'starter.mocks.faults',
      current ? `${current},${name}` : name,
    );
  }, fault);

export { expect };

/**
 * Production builds only: a stateful fake of the cookie-session contract
 * (src/auth/adapters/session.ts) through page.route, so journeys run against
 * a real build without a backend. `fail` makes the next call of an endpoint
 * answer with that status once.
 */
export const fakeSessionApi = async (
  page: Page,
  {
    signedIn = false,
    needsOnboarding = false,
  }: { signedIn?: boolean; needsOnboarding?: boolean } = {},
) => {
  const state = {
    signedIn,
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      needsOnboarding,
    },
    calls: { restore: 0, signIn: 0, signOut: 0, onboarding: 0 },
    failures: new Map<string, number>(),
    fail(
      endpoint: 'restore' | 'signIn' | 'signOut' | 'onboarding',
      status: number,
    ) {
      state.failures.set(endpoint, status);
    },
  };
  const json = (route: Route, status: number, body?: unknown) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: body === undefined ? '' : JSON.stringify(body),
    });
  const failure = (endpoint: string) => {
    const status = state.failures.get(endpoint);
    state.failures.delete(endpoint);
    return status;
  };
  await page.route('**/api/session/onboarding', async (route) => {
    state.calls.onboarding += 1;
    const status = failure('onboarding');
    if (status) return json(route, status, { status });
    if (!state.signedIn) return json(route, 401);
    state.user = { ...state.user, needsOnboarding: false };
    return json(route, 200, { user: state.user });
  });
  await page.route('**/api/session', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      state.calls.restore += 1;
      const status = failure('restore');
      if (status) return json(route, status, { status });
      return state.signedIn
        ? json(route, 200, { user: state.user })
        : json(route, 401);
    }
    if (method === 'POST') {
      state.calls.signIn += 1;
      const body = route.request().postDataJSON() as { password?: string };
      if (body.password === 'wrong') return json(route, 401);
      state.signedIn = true;
      return json(route, 200, { user: state.user });
    }
    if (method === 'DELETE') {
      state.calls.signOut += 1;
      const status = failure('signOut');
      if (status) return json(route, status, { status });
      state.signedIn = false;
      return route.fulfill({ status: 204 });
    }
    return json(route, 405);
  });
  return state;
};

/** Signs in through the UI (the app must be on the sign-in page). */
export const signInWithForm = async (page: Page, password = 'secret') => {
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

/**
 * Longest movement on the page (seconds): transitions of motion properties
 * (transform, position, size, opacity) and keyframe animations. Color and
 * shadow fades are not motion and are ignored. Runs in the page.
 */
export const longestMotion = () => {
  const MOTION =
    /^(all|transform|translate|scale|rotate|opacity|top|left|right|bottom|inset|margin.*|width|height)$/;
  const list = (value: string) => value.split(',').map((part) => part.trim());
  const seconds = (value: string) => parseFloat(value) || 0;
  return Math.max(
    0,
    ...Array.from(document.querySelectorAll('*')).map((element) => {
      const style = getComputedStyle(element);
      const properties = list(style.transitionProperty);
      const durations = list(style.transitionDuration);
      const delays = list(style.transitionDelay);
      const transition = Math.max(
        0,
        ...properties.map((property, index) =>
          MOTION.test(property)
            ? seconds(durations[index % durations.length] ?? '0') +
              seconds(delays[index % delays.length] ?? '0')
            : 0,
        ),
      );
      const animation =
        style.animationName === 'none'
          ? 0
          : Math.max(...list(style.animationDuration).map(seconds)) +
            Math.max(...list(style.animationDelay).map(seconds));
      return Math.max(transition, animation);
    }),
  );
};

/**
 * Waits until a flow step has fully settled: no slide in progress, no exiting
 * step left in the DOM.
 */
export const expectFlowSettled = async (page: Page) => {
  await waitForRouteTransition(page);
  await expect(page.locator('[data-center-phase="settled"]')).toHaveCount(1);
  await expect(page.locator('[data-overlay="exit"]')).toHaveCount(0);
};
