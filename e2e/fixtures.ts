import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Routing uses hash URLs, so every in-app path is `<base>#<path>`. Relative
 * navigation keeps the configured base path (root or sub-path).
 */
export const gotoApp = (page: Page, path = '/') =>
  page.goto(path === '/' ? './' : `./#${path}`);

export const currentAppPath = (page: Page) =>
  new URL(page.url()).hash.replace(/^#/, '') || '/';

/** WCAG 2.2 A/AA plus axe best practices; any violation fails the test. */
export const expectNoA11yViolations = async (page: Page) => {
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
  expect(summary, 'accessibility violations').toEqual([]);
};

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
          !allowedConsoleErrors.some((pattern) => pattern.test(text))
        ) {
          errors.push(`console: ${text}`);
        }
      });
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
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
