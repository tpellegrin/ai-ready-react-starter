import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

import { captureScroll } from './scroll';

/**
 * The capture contract of `pnpm design capture` ("extent": "scroll"), on
 * static pages: whole-content evidence never resizes the viewport, reaches
 * the end of the content (document or nested scroller), leaves height-based
 * layout as it is at the requested size, and says when it could not reach
 * the end instead of claiming it did.
 */
const VIEWPORT = { width: 800, height: 600 };
test.use({ viewport: VIEWPORT });

type Shot = {
  index: number;
  scrollTop: number;
  viewport: { width: number; height: number } | null;
  probe: Record<string, number | boolean>;
};

/** Runs captureScroll, recording what each screenshot would show. */
const record = async (
  page: Page,
  probe: () => Record<string, number | boolean>,
  options: { container?: string; maxScreenshots?: number } = {},
) => {
  const shots: Shot[] = [];
  const extent = await captureScroll(page, {
    ...(options.container
      ? { container: page.locator(options.container) }
      : {}),
    ...(options.maxScreenshots
      ? { maxScreenshots: options.maxScreenshots }
      : {}),
    settle: async () => {
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(resolve)),
      );
    },
    shoot: async (index, scrollTop) => {
      shots.push({
        index,
        scrollTop,
        viewport: page.viewportSize(),
        probe: await page.evaluate(probe),
      });
    },
  });
  return { extent, shots };
};

test('a 100vh hero followed by content: the hero keeps the viewport height and the end is reached', async ({
  page,
}) => {
  await page.setContent(`
    <style>body { margin: 0 } .hero { height: 100vh } .content { height: 2600px }</style>
    <section class="hero" id="hero">Hero</section>
    <div class="content"></div>
    <p id="end">The end</p>`);

  const { extent, shots } = await record(page, () => ({
    hero: document.getElementById('hero')?.getBoundingClientRect().height ?? 0,
    end: ((selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return !!box && box.top >= 0 && box.bottom <= window.innerHeight;
    })('#end'),
  }));

  expect(extent).toMatchObject({
    container: 'document',
    complete: true,
    missing: 0,
  });
  expect(extent.positions.length).toBeGreaterThan(4);
  for (const shot of shots) {
    expect(shot.viewport).toEqual(VIEWPORT);
    // Growing the viewport would grow the hero with it.
    expect(shot.probe.hero).toBe(VIEWPORT.height);
  }
  expect(shots.at(-1)?.probe.end).toBe(true);
  expect(shots.slice(0, -1).some((shot) => shot.probe.end)).toBe(false);
});

test("the foundation's nested scroller: the content scrolls under a fixed header to its end", async ({
  page,
}) => {
  await page.setContent(`
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden }
      .root { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100dvh }
      header { height: 64px }
      main { overflow: hidden auto; min-height: 0 }
      .content { height: 2200px }
    </style>
    <div class="root">
      <header id="header">App</header>
      <main aria-label="Content"><div class="content"></div><p id="end">The end</p></main>
    </div>`);

  const { extent, shots } = await record(page, () => {
    const visible = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return !!box && box.top >= 0 && box.bottom <= window.innerHeight;
    };
    return { header: visible('#header'), end: visible('#end') };
  });

  expect(extent).toMatchObject({
    container: 'main[aria-label="Content"]',
    complete: true,
    missing: 0,
  });
  for (const shot of shots) {
    expect(shot.viewport).toEqual(VIEWPORT);
    expect(shot.probe.header).toBe(true);
  }
  expect(shots.at(-1)?.probe.end).toBe(true);
  await expect(page.locator('main')).toHaveJSProperty('scrollTop', 0);
});

test('height-dependent rules stay as they are at the requested viewport', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      body { margin: 0 } .content { height: 2400px }
      .tall-only { display: none }
      @media (min-height: 1000px) { .tall-only { display: block } }
    </style>
    <p class="tall-only" id="tall">Only on tall screens</p>
    <div class="content"></div>`);

  const { extent, shots } = await record(page, () => ({
    tall:
      getComputedStyle(document.getElementById('tall') as Element).display !==
      'none',
  }));

  expect(extent.complete).toBe(true);
  for (const shot of shots) {
    expect(shot.viewport).toEqual(VIEWPORT);
    expect(shot.probe.tall).toBe(false);
  }
});

test('content it cannot reach is reported as missing, never as complete', async ({
  page,
}) => {
  await page.setContent(`
    <style>body { margin: 0 } .content { height: 6000px }</style>
    <div class="content"></div><p id="end">The end</p>`);

  const { extent, shots } = await record(
    page,
    () => {
      const box = document.getElementById('end')?.getBoundingClientRect();
      return { end: !!box && box.top >= 0 && box.bottom <= window.innerHeight };
    },
    { maxScreenshots: 3 },
  );

  expect(shots).toHaveLength(3);
  expect(extent.complete).toBe(false);
  expect(extent.missing).toBe(extent.scrollHeight - (1200 + VIEWPORT.height));
  expect(shots.some((shot) => shot.probe.end)).toBe(false);
});

test('a named container is used instead of the largest one', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden }
      .row { display: flex; height: 100% }
      nav { width: 200px; overflow-y: auto } main { flex: 1; overflow-y: auto }
    </style>
    <div class="row">
      <nav aria-label="Side"><div style="height: 1500px"></div><p id="nav-end">Last link</p></nav>
      <main aria-label="Main"><div style="height: 3000px"></div></main>
    </div>`);

  const { extent, shots } = await record(
    page,
    () => {
      const box = document.getElementById('nav-end')?.getBoundingClientRect();
      return { end: !!box && box.top >= 0 && box.bottom <= window.innerHeight };
    },
    { container: 'nav' },
  );

  expect(extent).toMatchObject({
    container: 'nav[aria-label="Side"]',
    complete: true,
  });
  expect(shots.at(-1)?.probe.end).toBe(true);
});

test('an unnamed scroll container is described by its size and place', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden }
      header { height: 64px }
      .content { height: calc(100% - 64px); overflow-y: auto }
    </style>
    <header>App</header>
    <div class="content"><div style="height: 1800px"></div></div>`);

  const { extent } = await record(page, () => ({}));

  expect(extent).toMatchObject({
    container: 'div (800×536 at y 64)',
    complete: true,
  });
});
