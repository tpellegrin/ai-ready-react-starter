import type { Page } from '@playwright/test';

/**
 * Waits for the images a person would see now: every eager image still
 * loading, and lazy ones (`loading="lazy"`) in view. A lazy image out of
 * view (below the fold, scrolled away inside a scroller, or not rendered)
 * is not requested until it nears the viewport, so it is never waited for;
 * with "extent": "scroll", settling again at each scroll position
 * (scroll.ts) waits for the lazy images that came into view there.
 *
 * "In view" is what an IntersectionObserver on the viewport reports, which
 * accounts for clipping by scroll containers as the browser's lazy loading
 * does. Fails after `timeoutMs`, naming the images still loading. Used by
 * capture.spec.ts and proven on static pages by scroll.spec.ts.
 */
export const waitForImagesInView = (page: Page, timeoutMs: number) =>
  page.evaluate(async (timeout) => {
    const inView = (image: HTMLImageElement) =>
      new Promise<boolean>((resolve) => {
        const observer = new IntersectionObserver(([entry]) => {
          observer.disconnect();
          resolve(entry?.isIntersecting ?? false);
        });
        observer.observe(image);
      });
    const awaited = await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map(async (image) =>
          image.loading !== 'lazy' || (await inView(image)) ? image : null,
        ),
    );
    const loading = new Set(
      awaited.filter(
        (image): image is HTMLImageElement => !!image && !image.complete,
      ),
    );
    if (!loading.size) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const sources = [...loading].map(
          (image) => image.currentSrc || image.src,
        );
        reject(
          new Error(
            `images still loading after ${timeout} ms: ${sources.join(', ')}`,
          ),
        );
      }, timeout);
      for (const image of loading) {
        const done = () => {
          loading.delete(image);
          if (loading.size) return;
          clearTimeout(timer);
          resolve();
        };
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      }
    });
  }, timeoutMs);
