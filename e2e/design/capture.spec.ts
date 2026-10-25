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

import { captureScroll } from './scroll';

/**
 * Renders the capture scenarios of a composition plan
 * (`pnpm design capture|regress`; manifest written by
 * scripts/lib/design/capture.mjs). Each scenario sets up its route,
 * session, declared API responses, viewport, scale, locale, color scheme
 * and motion preference; performs its steps; waits for its explicit
 * readiness conditions, fonts, images, route transitions and motion; then
 * records screenshots at the requested viewport (never resized: one, or
 * one per scroll position with "extent": "scroll", see scroll.ts), the
 * boxes of the plan's regions, axe results and the environment. Regression
 * runs also compare every screenshot with its reviewed baseline.
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
  extent: 'viewport' | 'scroll';
  scrollContainer?: LocatorSpec;
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

/**
 * The box a person sees, in CSS pixels: the element's own box when it
 * paints something (background, border, shadow) or is a control or media,
 * otherwise the extent of its content (a heading's text, a list's items).
 * Measured at scroll position 0. Runs in the page.
 */
const visibleBox = (element: Element): Box => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const paints =
    /^(img|svg|canvas|video|input|select|textarea|button|iframe)$/i.test(
      element.tagName,
    ) ||
    !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(style.backgroundColor) ||
    style.backgroundImage !== 'none' ||
    style.boxShadow !== 'none' ||
    ['top', 'right', 'bottom', 'left'].some(
      (side) =>
        parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
        style.getPropertyValue(`border-${side}-style`) !== 'none',
    );
  // In the scrolled content's frame: an element that is or contains the
  // scroll container extends as far as the content it scrolls. Its own box
  // stops at the scroller's visible height, and so does a content range
  // that reaches the scroller only as a descendant's border box; the range
  // over the scroller's own children already spans the scrolled content.
  const scroller = document.querySelector('[data-design-scroller]');
  const overflow =
    scroller && (element === scroller || element.contains(scroller))
      ? Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      : 0;
  const box = (r: DOMRect, extra: number) => ({
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height + extra,
  });
  if (paints) return box(rect, overflow);
  const range = document.createRange();
  range.selectNodeContents(element);
  const content = range.getBoundingClientRect();
  return content.width && content.height
    ? box(content, element === scroller ? 0 : overflow)
    : box(rect, overflow);
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
      // Error states the scenario declares log the failed request, and so
      // does a guest's session check (401), as in the production e2e specs.
      allowedConsoleErrors: [
        ...new Set([
          ...scenario.api.filter((a) => a.status >= 400).map((a) => a.status),
          ...(scenario.session === 'guest' ? [401] : []),
        ]),
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

        // Screenshots first, at the requested viewport (never resized): one,
        // or one per scroll position of the page's scroll container.
        phase = 'capture';
        fs.mkdirSync(path.dirname(scenario.output.screenshot), {
          recursive: true,
        });
        const shotPath = (index: number) =>
          index === 0
            ? scenario.output.screenshot
            : scenario.output.screenshot.replace(
                /\.png$/,
                `--scroll-${index}.png`,
              );
        const screenshots: Array<{ file: string; scrollTop: number }> = [];
        const regressionErrors: string[] = [];
        const shoot = async (index: number, scrollTop: number) => {
          await page.screenshot({
            path: shotPath(index),
            animations: 'disabled',
            caret: 'hide',
          });
          screenshots.push({ file: path.basename(shotPath(index)), scrollTop });
          if (manifest.mode === 'regression' && scenario.baseline) {
            const [task = '', folder = ''] = scenario.baseline;
            try {
              await expect(page).toHaveScreenshot(
                index === 0
                  ? scenario.baseline
                  : [task, folder, `${scenario.id}--scroll-${index}.png`],
              );
            } catch (error) {
              regressionErrors.push(
                error instanceof Error ? error.message : String(error),
              );
            }
          }
        };
        const extent =
          scenario.extent === 'scroll'
            ? await captureScroll(page, {
                container: scenario.scrollContainer
                  ? find(page, scenario.scrollContainer)
                  : undefined,
                settle: () => settle(page),
                shoot,
              })
            : null;
        if (!extent) await shoot(0, 0);
        result.screenshots = screenshots;
        result.extent = extent
          ? { kind: 'scroll', ...extent }
          : { kind: 'viewport' };
        if (manifest.mode === 'regression') {
          result.regression = {
            error: regressionErrors[0] ?? null,
            errors: regressionErrors,
          };
        }

        phase = 'measure';
        const viewport = page.viewportSize() ?? scenario.viewport;
        if (
          viewport.width !== scenario.viewport.width ||
          viewport.height !== scenario.viewport.height
        ) {
          throw new Error(
            `the viewport changed to ${viewport.width}×${viewport.height}; the capture is not evidence of ${scenario.viewport.width}×${scenario.viewport.height}`,
          );
        }
        result.frame = viewport;
        // Boxes are measured at scroll position 0: content below the fold
        // has positions past the viewport, in the scrolled content's frame.
        result.content = {
          width: viewport.width,
          height:
            viewport.height +
            (extent
              ? Math.max(0, extent.scrollHeight - extent.clientHeight)
              : 0),
        };
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
            const box: Box | null = await first.evaluate(visibleBox);
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
          viewport: `${viewport.width}×${viewport.height} (as requested; never resized)`,
          extent: extent
            ? `scroll: ${extent.positions.length} screenshot(s) of ${extent.container} at ${extent.positions.join(', ')} px of ${extent.scrollHeight} px${extent.complete ? ', end reached' : `, INCOMPLETE: the last ${extent.missing} px were never in view`}`
            : 'viewport: one screenshot',
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

        if (regressionErrors.length) {
          failure = new Error(regressionErrors[0]);
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
