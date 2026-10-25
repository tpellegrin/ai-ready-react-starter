import type { Locator, Page } from '@playwright/test';

/**
 * Whole-content evidence at the requested viewport: screenshots at
 * successive scroll positions of the element the page scrolls with. The
 * viewport is never resized, so `vh` units, height media queries and sticky
 * elements behave as they do for a person at that size; content below the
 * fold is reached by scrolling, as a person would.
 *
 * The scroll container is the one named, or the largest element that
 * scrolls vertically (the document, or a nested scroller such as the
 * foundation's MainLayout content). Used by capture.spec.ts and proven on
 * static pages by scroll.spec.ts.
 */

export type ScrollExtent = {
  /** What scrolled: "document", or a short description of the element. */
  container: string;
  clientHeight: number;
  scrollHeight: number;
  /** scrollTop of each screenshot, in order. */
  positions: number[];
  /** The last screenshot reached the end of the scrolled content. */
  complete: boolean;
  /** Pixels of content no screenshot showed (0 when complete). */
  missing: number;
};

/** Stays on the scroll container after a capture (capture.spec.ts reads it). */
const MARK = 'data-design-scroller';

/** Marks the scroll container (or reports that nothing scrolls). */
const markScroller = async (page: Page, container?: Locator) => {
  await page.evaluate((mark) => {
    document.querySelector(`[${mark}]`)?.removeAttribute(mark);
  }, MARK);
  if (container) {
    await container.first().evaluate((element, mark) => {
      element.setAttribute(mark, '');
    }, MARK);
  } else {
    await page.evaluate((mark) => {
      const scrolls = (element: Element) => {
        if (element.scrollHeight <= element.clientHeight + 1) return false;
        if (element === document.scrollingElement) {
          return !['hidden', 'clip'].includes(
            getComputedStyle(document.body).overflowY,
          );
        }
        return /^(auto|scroll|overlay)$/.test(
          getComputedStyle(element).overflowY,
        );
      };
      const candidates = [
        ...(document.scrollingElement ? [document.scrollingElement] : []),
        ...Array.from(document.querySelectorAll('body *')),
      ].filter(scrolls);
      const largest = candidates.sort(
        (a, b) =>
          b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight,
      )[0];
      largest?.setAttribute(mark, '');
    }, MARK);
  }
  return page.evaluate((mark) => {
    const element = document.querySelector(`[${mark}]`);
    if (!element) return null;
    const label = element.getAttribute('aria-label');
    const box = element.getBoundingClientRect();
    // Unnamed elements (a layout's content area) are told apart by place.
    const description =
      element === document.scrollingElement
        ? 'document'
        : element.id || label
          ? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${label ? `[aria-label="${label}"]` : ''}`
          : `${element.tagName.toLowerCase()} (${Math.round(box.width)}×${Math.round(box.height)} at y ${Math.round(box.y)})`;
    return {
      description,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  }, MARK);
};

/** Scrolls the marked container; returns where it really is now. */
const scrollTo = (page: Page, top: number) =>
  page.evaluate(
    ([mark, value]) => {
      const element = document.querySelector(`[${mark}]`);
      if (!element) return { top: 0, clientHeight: 0, scrollHeight: 0 };
      element.scrollTop = value;
      return {
        top: element.scrollTop,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      };
    },
    [MARK, top] as const,
  );

/**
 * Takes `shoot(index, scrollTop)` at scroll position 0, then one container
 * height further each time, until the end is in view or `maxScreenshots`
 * were taken (then the extent says what was missed). Returns to the top.
 */
export const captureScroll = async (
  page: Page,
  {
    container,
    maxScreenshots = 12,
    settle,
    shoot,
  }: {
    container?: Locator | undefined;
    maxScreenshots?: number;
    settle: () => Promise<void>;
    shoot: (index: number, scrollTop: number) => Promise<void>;
  },
): Promise<ScrollExtent> => {
  const found = await markScroller(page, container);
  if (!found) {
    await shoot(0, 0);
    return {
      container: 'nothing scrolls',
      clientHeight: page.viewportSize()?.height ?? 0,
      scrollHeight: page.viewportSize()?.height ?? 0,
      positions: [0],
      complete: true,
      missing: 0,
    };
  }
  const positions: number[] = [];
  let target = 0;
  let last = {
    top: 0,
    clientHeight: found.clientHeight,
    scrollHeight: found.scrollHeight,
  };
  for (let index = 0; index < maxScreenshots; index += 1) {
    last = await scrollTo(page, target);
    await settle();
    // Settling (lazy content, reveals) can change the height: measure again.
    last = await scrollTo(page, last.top);
    await shoot(index, last.top);
    positions.push(last.top);
    if (last.top + last.clientHeight >= last.scrollHeight - 1) break;
    const next = Math.min(
      last.top + last.clientHeight,
      last.scrollHeight - last.clientHeight,
    );
    if (next <= last.top) break; // it does not scroll any further
    target = next;
  }
  const missing = Math.max(
    0,
    Math.round(last.scrollHeight - (last.top + last.clientHeight)),
  );
  await scrollTo(page, 0);
  await settle();
  return {
    container: found.description,
    clientHeight: last.clientHeight,
    scrollHeight: last.scrollHeight,
    positions,
    complete: missing <= 1,
    missing: missing <= 1 ? 0 : missing,
  };
};
