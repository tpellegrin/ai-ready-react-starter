import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';

import { waitForImagesInView } from './images';
import { captureScroll } from './scroll';

/**
 * The capture contract of `pnpm design capture` ("extent": "scroll"), on
 * static pages: whole-content evidence never resizes the viewport, reaches
 * the end of the content (document or nested scroller), leaves height-based
 * layout as it is at the requested size, and says when it could not reach
 * the end instead of claiming it did. Settling waits for the images in view,
 * never for lazy ones out of view, and names the images it gave up on.
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
  options: {
    container?: string;
    maxScreenshots?: number;
    settle?: () => Promise<void>;
  } = {},
) => {
  const shots: Shot[] = [];
  const extent = await captureScroll(page, {
    ...(options.container
      ? { container: page.locator(options.container) }
      : {}),
    ...(options.maxScreenshots
      ? { maxScreenshots: options.maxScreenshots }
      : {}),
    settle:
      options.settle ??
      (async () => {
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(resolve)),
        );
      }),
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

/** A 1×1 PNG, served for every image URL below. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('settling waits for images in view, and for lazy ones once scrolling brings them into view', async ({
  page,
}) => {
  const requested: string[] = [];
  await page.route('http://images.invalid/*.png', async (route) => {
    const file = new URL(route.request().url()).pathname;
    requested.push(file);
    // The image in view arrives late: settling has to wait for it.
    if (file === '/top.png') await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ contentType: 'image/png', body: PIXEL });
  });
  // Like MainLayout: a nested scroller with content far below the fold.
  await page.setContent(
    `<style>
      html, body { margin: 0; height: 100%; overflow: hidden }
      main { height: 100vh; overflow: auto } .spacer { height: 4000px }
    </style>
    <main aria-label="Content">
      <img id="top" src="http://images.invalid/top.png" width="40" height="40" alt="">
      <img src="http://images.invalid/hidden.png" loading="lazy" style="display: none" alt="">
      <div class="spacer"></div>
      <img id="below" src="http://images.invalid/below.png" loading="lazy" width="40" height="40" alt="">
    </main>`,
    { waitUntil: 'domcontentloaded' },
  );
  const loaded = (id: string) => {
    const image = document.getElementById(id) as HTMLImageElement | null;
    return !!image && image.complete && image.naturalWidth > 0;
  };

  await waitForImagesInView(page, 5_000);
  expect(await page.evaluate(loaded, 'top')).toBe(true);
  expect(requested).toEqual(['/top.png']);

  const { extent, shots } = await record(
    page,
    () => {
      const image = document.getElementById('below') as HTMLImageElement;
      return { below: image.complete && image.naturalWidth > 0 };
    },
    { settle: () => waitForImagesInView(page, 5_000) },
  );

  expect(extent).toMatchObject({
    container: 'main[aria-label="Content"]',
    complete: true,
  });
  expect(shots.at(-1)?.probe.below).toBe(true);
  expect(requested).not.toContain('/hidden.png');
});

test('settling names the images it gave up waiting for', async ({ page }) => {
  // Never answered: the image stays loading.
  await page.route('http://images.invalid/stuck.png', () => undefined);
  await page.setContent(
    '<img src="http://images.invalid/stuck.png" width="40" height="40" alt="">',
    { waitUntil: 'domcontentloaded' },
  );

  await expect(waitForImagesInView(page, 500)).rejects.toThrow(
    'images still loading after 500 ms: http://images.invalid/stuck.png',
  );
});
