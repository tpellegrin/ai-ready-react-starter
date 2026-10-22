import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { Locator, Page } from '@playwright/test';

import {
  axeViolations,
  expect,
  fakeSessionApi,
  gotoApp,
  settleMotion,
  test,
  waitForRouteTransition,
} from '../fixtures';

/**
 * Renders the capture scenarios of a composition plan
 * (`pnpm design capture|regress`; manifest written by
 * scripts/lib/design/capture.mjs). Each scenario sets up its route,
 * session, declared API responses, viewport, scale, locale, color scheme
 * and motion preference; performs its steps; waits for its explicit
 * readiness conditions, fonts, images, route transitions and motion; then
 * records a screenshot, the boxes of the plan's regions, axe results and
 * the environment. Regression runs also compare with the reviewed baseline.
 * Results go to the run folder even when a phase fails, so the report can
 * say which phase failed and why.
 */
type LocatorSpec = {
  role?: string;
  name?: string;
  level?: number;
  label?: string;
  text?: string;
  testId?: string;
  exact?: boolean;
};
type ApiResponse = {
  method: string;
  path: string;
  status: number;
  body?: unknown;
  hold?: boolean;
};
type Step = {
  action: 'click' | 'fill' | 'press' | 'check' | 'select' | 'hover';
  target?: LocatorSpec;
  value?: string;
  key?: string;
};
type Scenario = {
  task: string;
  id: string;
  route: string;
  browser: 'chromium' | 'webkit';
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  mobile: boolean;
  locale: string;
  colorScheme: 'light' | 'dark';
  reducedMotion: 'reduce' | 'no-preference';
  fullPage: boolean;
  session: 'guest' | 'signed-in' | 'needs-onboarding';
  api: ApiResponse[];
  steps: Step[];
  ready: Array<LocatorSpec & { state?: 'visible' | 'hidden' }>;
  timeoutMs: number;
  regions: Array<{ id: string; label: string; locator: LocatorSpec }>;
  output: { screenshot: string; result: string };
  baseline: string[] | null;
};
type Manifest = {
  mode: 'capture' | 'regression';
  runDir: string;
  scenarios: Scenario[];
};
type Box = { x: number; y: number; width: number; height: number };

const manifestFile = process.env.DESIGN_MANIFEST ?? '';
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Manifest;
const playwrightVersion = (
  createRequire(import.meta.url)('@playwright/test/package.json') as {
    version: string;
  }
).version;

const describeLocator = (spec: LocatorSpec) =>
  spec.role
    ? `role=${spec.role}${spec.name ? ` name="${spec.name}"` : ''}${spec.level ? ` level=${spec.level}` : ''}`
    : spec.label
      ? `label="${spec.label}"`
      : spec.text
        ? `text="${spec.text}"`
        : `testId="${spec.testId ?? ''}"`;

const find = (page: Page, spec: LocatorSpec): Locator => {
  const exact = spec.exact === undefined ? {} : { exact: spec.exact };
  if (spec.role) {
    return page.getByRole(spec.role as Parameters<Page['getByRole']>[0], {
      ...(spec.name === undefined ? {} : { name: spec.name }),
      ...(spec.level === undefined ? {} : { level: spec.level }),
      ...exact,
    });
  }
  if (spec.label) return page.getByLabel(spec.label, exact);
  if (spec.text) return page.getByText(spec.text, exact);
  return page.getByTestId(spec.testId ?? '');
};

/** Declared API responses; anything else is recorded as undeclared. */
const routeApi = async (
  page: Page,
  scenario: Scenario,
  unexpected: string[],
) => {
  await page.route('**/api/**', (route) => {
    const request = route.request();
    unexpected.push(
      `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, '')}`,
    );
    return route.abort();
  });
  await fakeSessionApi(page, {
    signedIn: scenario.session !== 'guest',
    needsOnboarding: scenario.session === 'needs-onboarding',
  });
  const queues = new Map<string, ApiResponse[]>();
  for (const response of scenario.api) {
    const key = `${response.method} ${response.path}`;
    queues.set(key, [...(queues.get(key) ?? []), response]);
  }
  await page.route('**/api/**', (route) => {
    const request = route.request();
    const key = `${request.method()} ${new URL(request.url()).pathname.replace(/^\/api/, '')}`;
    const queue = queues.get(key);
    if (!queue?.length) return route.fallback();
    // Responses for the same call are used in order; the last one repeats.
    const response = (
      queue.length > 1 ? queue.shift() : queue[0]
    ) as ApiResponse;
    if (response.hold) return undefined; // never answered: a loading state
    return route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: response.body === undefined ? '' : JSON.stringify(response.body),
    });
  });
};

const perform = async (page: Page, step: Step) => {
  const target = step.target ? find(page, step.target) : null;
  switch (step.action) {
    case 'click':
      return target?.click();
    case 'hover':
      return target?.hover();
    case 'check':
      return target?.check();
    case 'fill':
      return target?.fill(step.value ?? '');
    case 'select':
      return target?.selectOption(step.value ?? '');
    case 'press':
      return target
        ? target.press(step.key ?? '')
        : page.keyboard.press(step.key ?? '');
  }
};

/** Fonts loaded, images decoded, transitions and motion finished. */
const settle = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((image) =>
        image.complete
          ? undefined
          : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            }),
      ),
    ).then(() => undefined),
  );
  await waitForRouteTransition(page);
  await settleMotion(page);
};

/** How much taller the viewport must be for scrolled content to fit. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    let extra = document.documentElement.scrollHeight - window.innerHeight;
    for (const element of Array.from(document.querySelectorAll('*'))) {
      const style = getComputedStyle(element);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight
      ) {
        extra = Math.max(extra, element.scrollHeight - element.clientHeight);
      }
    }
    return Math.max(0, Math.ceil(extra));
  });

for (const scenario of manifest.scenarios) {
  test.describe(`${scenario.task}/${scenario.id}`, () => {
    test.use({
      viewport: scenario.viewport,
      deviceScaleFactor: scenario.deviceScaleFactor,
      isMobile: scenario.mobile,
      hasTouch: scenario.mobile,
      locale: scenario.locale,
      colorScheme: scenario.colorScheme,
      reducedMotion: scenario.reducedMotion,
      // Error states the scenario declares log the failed request.
      allowedConsoleErrors: [
        ...new Set(
          scenario.api.filter((a) => a.status >= 400).map((a) => a.status),
        ),
      ].map(
        (status) =>
          new RegExp(
            `Failed to load resource: the server responded with a status of ${status}`,
          ),
      ),
    });

    test(scenario.id, async ({ page, browser }, testInfo) => {
      test.skip(
        testInfo.project.name !== scenario.browser,
        `runs in ${scenario.browser}`,
      );
      test.setTimeout(scenario.timeoutMs * 4 + 60_000);
      const startedAt = Date.now();
      const unexpected: string[] = [];
      let phase = 'navigation';
      const result: Record<string, unknown> = { status: 'captured' };
      let failure: Error | null = null;
      try {
        await routeApi(page, scenario, unexpected);
        await gotoApp(page, scenario.route);

        phase = 'steps';
        for (const [index, step] of scenario.steps.entries()) {
          try {
            await perform(page, step);
          } catch (error) {
            throw new Error(
              `step ${index + 1} (${step.action}${step.target ? ` ${describeLocator(step.target)}` : ''}): ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
            );
          }
        }

        phase = 'ready';
        for (const condition of scenario.ready) {
          const locator = find(page, condition).first();
          const state = condition.state ?? 'visible';
          try {
            await (state === 'visible'
              ? expect(locator).toBeVisible({ timeout: scenario.timeoutMs })
              : expect(locator).toBeHidden({ timeout: scenario.timeoutMs }));
          } catch {
            throw new Error(
              `readiness condition not met: ${describeLocator(condition)} was not ${state} within ${scenario.timeoutMs} ms`,
            );
          }
        }

        phase = 'settle';
        await settle(page);
        if (scenario.fullPage) {
          for (let round = 0; round < 3; round += 1) {
            const extra = await overflow(page);
            if (!extra) break;
            const size = page.viewportSize() ?? scenario.viewport;
            await page.setViewportSize({
              width: size.width,
              height: size.height + extra,
            });
            await settle(page);
          }
        }

        phase = 'measure';
        const viewport = page.viewportSize() ?? scenario.viewport;
        result.frame = viewport;
        result.regions = await Promise.all(
          scenario.regions.map(async (region) => {
            const locator = find(page, region.locator);
            const count = await locator.count();
            if (!count) {
              return {
                id: region.id,
                found: false,
                visible: false,
                count,
                box: null,
              };
            }
            const first = locator.first();
            const box: Box | null = await first.boundingBox();
            return {
              id: region.id,
              found: true,
              visible: await first.isVisible(),
              count,
              box,
            };
          }),
        );
        result.a11y = (await axeViolations(page)).map((violation) => ({
          id: violation.id,
          impact: violation.impact ?? 'n/a',
          help: violation.help,
          targets: violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(' ')),
        }));
        result.environment = {
          url: page.url(),
          route: scenario.route,
          browser: `${browser.browserType().name()} ${browser.version()}`,
          playwright: playwrightVersion,
          platform: `${process.platform} ${process.arch}`,
          node: process.version,
          requestedViewport: `${scenario.viewport.width}×${scenario.viewport.height}`,
          capturedViewport: `${viewport.width}×${viewport.height}${viewport.height !== scenario.viewport.height ? ' (grown to fit the scrolled content)' : ''}`,
          deviceScaleFactor: scenario.deviceScaleFactor,
          mobile: scenario.mobile,
          session: scenario.session,
          api: scenario.api.map(
            (a) =>
              `${a.method} ${a.path} → ${a.hold ? 'held (no answer)' : a.status}`,
          ),
          steps: scenario.steps.length,
          ready: scenario.ready.map(
            (r) => `${describeLocator(r)} ${r.state ?? 'visible'}`,
          ),
          ...(await page.evaluate(() => {
            const fonts: string[] = [];
            document.fonts.forEach((font) =>
              fonts.push(
                `${font.family} ${font.weight} ${font.style}: ${font.status}`,
              ),
            );
            return {
              documentLang: document.documentElement.lang,
              devicePixelRatio: window.devicePixelRatio,
              prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
              prefersReducedMotion: matchMedia(
                '(prefers-reduced-motion: reduce)',
              ).matches,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              fontsStatus: document.fonts.status,
              fonts,
              images: `${Array.from(document.images).filter((i) => i.naturalWidth > 0).length}/${document.images.length} loaded`,
            };
          })),
          locale: scenario.locale,
          colorScheme: scenario.colorScheme,
          reducedMotion: scenario.reducedMotion,
        };

        phase = 'capture';
        fs.mkdirSync(path.dirname(scenario.output.screenshot), {
          recursive: true,
        });
        await page.screenshot({
          path: scenario.output.screenshot,
          animations: 'disabled',
          caret: 'hide',
        });

        if (manifest.mode === 'regression' && scenario.baseline) {
          phase = 'regression';
          try {
            await expect(page).toHaveScreenshot(scenario.baseline);
            result.regression = { error: null };
          } catch (error) {
            failure = error instanceof Error ? error : new Error(String(error));
            result.regression = { error: failure.message };
          }
        }
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
        result.status = 'failed';
        result.phase = phase;
        result.error = failure.message;
        // What the page looked like when it failed, for the report.
        await page
          .screenshot({ path: scenario.output.screenshot })
          .catch(() => undefined);
      } finally {
        result.unexpectedRequests = unexpected;
        result.durationMs = Date.now() - startedAt;
        fs.mkdirSync(path.dirname(scenario.output.result), { recursive: true });
        fs.writeFileSync(
          scenario.output.result,
          `${JSON.stringify(result, null, 2)}\n`,
        );
      }
      if (failure) throw failure;
      expect(
        unexpected,
        `undeclared API requests: ${unexpected.join(', ')}`,
      ).toEqual([]);
    });
  });
}
