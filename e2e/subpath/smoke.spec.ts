import { expect, fakeSessionApi, gotoApp, test } from '../fixtures';

/**
 * The production build deployed under a sub-path (BASE_PATH=/app/, project
 * `production-subpath`), with the API faked through page.route as in the
 * production specs. `pnpm check:build --base` only reads index.html; this
 * proves what loads at run time: the start page and a lazy route request
 * nothing outside the base path, no response fails, every image decodes
 * (lazy ones are switched to eager first) and every declared font loads.
 * Not demo code: it stays after adoption.
 */
test.use({
  // A guest's session check answers 401 (the session contract).
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of 401/,
  ],
});

test('the start page and a lazy route load every asset from under the base path', async ({
  page,
  baseURL,
}) => {
  const base = new URL(baseURL ?? '');
  const outside: string[] = [];
  const failed: string[] = [];
  const scripts: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/^(data|blob):/.test(url)) return;
    if (!url.startsWith(base.href)) outside.push(`${request.method()} ${url}`);
    if (request.resourceType() === 'script') scripts.push(url);
  });
  page.on('response', (response) => {
    const { pathname } = new URL(response.url());
    if (response.status() === 401 && pathname === `${base.pathname}api/session`)
      return; // a guest's session check
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) =>
    failed.push(`${request.failure()?.errorText ?? 'failed'} ${request.url()}`),
  );

  await fakeSessionApi(page);
  // Soft: when a page cannot render, the lists below say why.
  await gotoApp(page);
  await expect.soft(page.getByRole('heading', { level: 1 })).toBeVisible();
  const startScripts = scripts.length;

  await gotoApp(page, '/sign-in');
  await expect
    .soft(page.getByRole('heading', { level: 1, name: 'Sign in' }))
    .toBeVisible();
  expect
    .soft(scripts.length, 'the lazy route loads its own chunk')
    .toBeGreaterThan(startScripts);

  const brokenImages = await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map(async (image) => {
        if (image.loading === 'lazy') image.loading = 'eager';
        try {
          await image.decode();
          return null;
        } catch {
          return image.currentSrc || image.src || image.outerHTML;
        }
      }),
    ).then((sources) => sources.filter((source) => source !== null)),
  );
  const brokenFonts = await page.evaluate(async () => {
    const faces: FontFace[] = [];
    document.fonts.forEach((face) => faces.push(face));
    await Promise.allSettled(faces.map((face) => face.load()));
    return faces
      .filter((face) => face.status === 'error')
      .map((face) => `${face.family} ${face.weight} ${face.style}`);
  });

  // All soft: one run reports every problem.
  expect.soft(outside, 'requests outside the base path').toEqual([]);
  expect.soft(failed, 'failed requests').toEqual([]);
  expect.soft(brokenImages, 'broken images').toEqual([]);
  expect.soft(brokenFonts, 'fonts that failed to load').toEqual([]);
});
