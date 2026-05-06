import React from 'react';

import {
  getAccessibleDuration,
  prefersReducedMotion,
} from 'utils/transitions/config';
import { OverlayRoleContext } from 'components/CenterOnlyTransition/OverlayRoleContext';

import { FlipEntry, UseFlipLayoutOptions } from './types';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const resolveTarget = (
  host: HTMLElement,
  cache: WeakMap<HTMLElement, HTMLElement>,
): HTMLElement => {
  const cached = cache.get(host);
  if (cached) return cached;
  const inner = host.querySelector<HTMLElement>('[data-flip-target]');
  const target = inner ?? host;
  cache.set(host, target);
  return target;
};

const clearInlineHints = (el: HTMLElement) => {
  el.style.willChange = '';

  el.style.backfaceVisibility = '';
  el.style.removeProperty('--transition-duration');
  el.style.removeProperty('--transition-easing');
};

export const useFlipLayout = (
  containerRef: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList,
  options: UseFlipLayoutOptions = {},
): void => {
  const {
    selector = ':scope > *',
    durationMs = 250,
    easing = 'ease-in-out',
    disabled = false,
    lockAxis,
    composeTransforms = false,
  } = options;

  const overlayRole = React.useContext(OverlayRoleContext);
  const isExitOverlay = overlayRole === 'exit';

  // Previous rects across commits (init with null to satisfy strict TS)
  const prevRectsRef = React.useRef<Map<HTMLElement, DOMRect> | null>(null);
  // Cache host→target to avoid repeated queries (initialized eagerly)
  const targetCacheRef = React.useRef<WeakMap<HTMLElement, HTMLElement>>(
    new WeakMap(),
  );

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced = prefersReducedMotion();
    const shouldAnimate = !reduced && !disabled && !isExitOverlay;
    const targetCache = targetCacheRef.current;

    // Gather current hosts (LAST)
    let hosts: HTMLElement[] = [];
    if (selector === ':scope > *') {
      const { children } = container;
      hosts = Array(children.length);
      for (let i = 0; i < children.length; i += 1) {
        hosts[i] = children.item(i) as HTMLElement;
      }
    } else {
      hosts = Array.from(container.querySelectorAll<HTMLElement>(selector));
    }

    // Early store & bail if nothing to do
    if (hosts.length === 0) {
      prevRectsRef.current = new Map();
      return;
    }

    // Measure LAST rects
    const currentRects = new Map<HTMLElement, DOMRect>();
    for (let i = 0; i < hosts.length; i += 1) {
      const host = hosts[i];
      const target = resolveTarget(host, targetCache);
      currentRects.set(host, target.getBoundingClientRect());
    }

    const prevRects = prevRectsRef.current;

    if (prevRects && shouldAnimate) {
      // Build entries with precomputed deltas
      const entries: FlipEntry[] = [];
      for (let i = 0; i < hosts.length; i += 1) {
        const host = hosts[i];
        const prevRect = prevRects.get(host);
        if (!prevRect) continue;

        const target = resolveTarget(host, targetCache);
        const currRect = currentRects.get(host);
        if (!currRect) continue;

        let dx = prevRect.left - currRect.left;
        let dy = prevRect.top - currRect.top;
        if (lockAxis === 'y') dx = 0;
        if (lockAxis === 'x') dy = 0;
        if (dx === 0 && dy === 0) continue;

        const prevInlineTransform = target.style.transform;
        const prevInlineTransition = target.style.transition;
        const computedTransform = composeTransforms
          ? getComputedStyle(target).transform
          : 'none';

        entries.push({
          host,
          target,
          prevRect,
          currRect,
          dx,
          dy,
          prevInlineTransform,
          prevInlineTransition,
          addedOptIn: false,
          computedTransform,
        });
      }

      if (entries.length > 0) {
        const accessible = getAccessibleDuration(durationMs);
        if (accessible <= 0) {
          // Instant settle: no animation, no style churn
          prevRectsRef.current = currentRects;
          return;
        }

        // Seed inverted transforms without transition
        for (let i = 0; i < entries.length; i += 1) {
          const entry = entries[i];
          const el = entry.target;

          if (!el.hasAttribute('data-allow-motion')) {
            el.setAttribute('data-allow-motion', '');
            entry.addedOptIn = true;
          }

          el.style.setProperty('--transition-duration', `${accessible}ms`);
          el.style.setProperty('--transition-easing', easing);
          el.style.willChange = 'transform';
          el.style.backfaceVisibility = 'hidden';
          el.style.transition = 'none';

          // Compose with existing transform if requested
          if (
            composeTransforms &&
            entry.computedTransform &&
            entry.computedTransform !== 'none'
          ) {
            el.style.transform = `translate3d(${entry.dx}px, ${entry.dy}px, 0) ${entry.computedTransform}`;
          } else {
            el.style.transform = `translate3d(${entry.dx}px, ${entry.dy}px, 0)`;
          }
        }

        // Single reflow to commit all seeds

        container.getBoundingClientRect();

        // Play to identity (i.e., back to prior computed transform or 'none')
        for (let i = 0; i < entries.length; i += 1) {
          const entry = entries[i];
          const el = entry.target;
          el.style.transition =
            'transform var(--transition-duration) var(--transition-easing)';
          el.style.transform =
            composeTransforms && entry.computedTransform
              ? entry.computedTransform
              : 'translate3d(0, 0, 0)';
        }

        // Finalize: restore inline styles exactly; release opt-in if we added it
        let finished = 0;
        let didFinalize = false;

        const finalize = () => {
          if (didFinalize) return;
          didFinalize = true;
          for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const el = entry.target;
            el.style.transition = entry.prevInlineTransition;
            el.style.transform = entry.prevInlineTransform;
            clearInlineHints(el);
            if (entry.addedOptIn) {
              try {
                el.removeAttribute('data-allow-motion');
              } catch {
                /* noop */
              }
            }
          }
        };

        // Use AbortController for clean listener teardown
        const ac = new AbortController();
        const { signal } = ac;

        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== 'transform') return;
          finished += 1;
          if (finished >= entries.length) finalize();
        };

        for (let i = 0; i < entries.length; i += 1) {
          entries[i].target.addEventListener('transitionend', onEnd, {
            signal,
          });
        }

        const watchdog = window.setTimeout(finalize, accessible + 200);

        return () => {
          window.clearTimeout(watchdog);
          ac.abort();
        };
      }
    }

    // Store current rects for the next pass
    prevRectsRef.current = currentRects;

    return undefined;
  }, deps);
};
