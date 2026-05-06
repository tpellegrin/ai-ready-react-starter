/**
 * BaseLayout
 *
 * Canonical page layout component.
 *
 * Features:
 * - Scrollable `<main>` region with a themeable background or gradient.
 * - Optional header (sticky within the scroll container for in-context toolbars).
 * - Optional footer:
 *    - Inline (scrolls with content), or
 *    - Fixed to the viewport bottom. When fixed, the component measures its height via
 *      `ResizeObserver` and applies bottom padding to the scroll container to avoid overlap.
 *      Safe-area insets are automatically included.
 * - _LayoutHeaderContent container is centered and supports custom max width and paddings.
 *
 * Accessibility & Semantics:
 * - Uses proper landmarks: `<main>` is the primary scroll region. Header/footer are inside
 *   the layout hierarchy but do not replace app-level landmarks (if any).
 *
 * Performance:
 * - Footer height measurement is passive and only active when `fixedFooter` is true.
 * - `ResizeObserver` detaches on unmounting; window resize is handled efficiently.
 *
 * When to use:
 * - As the base scaffold for pages and nested routes.
 * - For screens that need a stable header or a fixed action footer on mobile.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  _BaseLayoutRoot,
  _BaseLayoutMain,
  _BaseLayoutContent,
  _BaseLayoutHeader,
  _BaseLayoutFooter,
} from './styles';
import { Props } from './types';
import { useNavigation } from 'globals/context/NavigationContext';
import { DURATION_MS } from 'containers/Layouts/common/LayoutTransitionContainer/types';
import { getAccessibleDuration } from 'utils/transitions/config';

export const BaseLayout: React.FC<Props> = ({
  children,
  backgroundColor,
  gradient,
  contentClassName,
  header,
  footer,
  stickyHeader,
  fixedFooter,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollRef, transition } = useNavigation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  // Register the REAL scroll container in NavigationContext (the content scroller).
  useLayoutEffect(() => {
    const el = contentRef.current;
    scrollRef.current = el;
    return () => {
      if (scrollRef.current === el) {
        scrollRef.current = null;
      }
    };
  }, [scrollRef]);

  // Track transition state and keep scrollbar hidden until after animation completes
  useEffect(() => {
    // Clear any pending timers
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (transition) {
      // Navigation started: hide immediately
      if (!isTransitioning) setIsTransitioning(true);
    } else {
      // Navigation ended: delay re-enabling for a small buffer to avoid flicker
      const delay = getAccessibleDuration(DURATION_MS) + 60; // buffer 60ms
      transitionTimeoutRef.current = window.setTimeout(() => {
        setIsTransitioning(false);
        transitionTimeoutRef.current = null;
      }, delay);
    }

    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [transition, isTransitioning]);

  return (
    <_BaseLayoutRoot ref={rootRef}>
      <_BaseLayoutMain
        ref={mainRef}
        $backgroundColor={backgroundColor}
        $gradient={gradient}
      >
        {header && (
          <_BaseLayoutHeader $sticky={stickyHeader}>{header}</_BaseLayoutHeader>
        )}

        <_BaseLayoutContent
          ref={contentRef}
          className={contentClassName}
          data-app-scroller="shell"
          data-transitioning={isTransitioning || undefined}
        >
          {children}
          {!fixedFooter && footer ? (
            <div className="layout-footer-inline">{footer}</div>
          ) : null}
        </_BaseLayoutContent>

        {fixedFooter && footer ? (
          <_BaseLayoutFooter $fixed={fixedFooter}>
            <div className="layout-footer-inner">{footer}</div>
          </_BaseLayoutFooter>
        ) : null}
      </_BaseLayoutMain>
    </_BaseLayoutRoot>
  );
};

export * from './styles';
export * from './types';
