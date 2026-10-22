import React, {
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { getAccessibleDuration } from 'utils/transitions/config';
import { OverlayRoleContext } from 'utils/transitions/overlayRole';
import {
  LayoutTransitionContainer,
  LayoutTransitionContainerInner,
} from '../common/LayoutTransitionContainer';
import { resolveFooter } from '../common/helpers';
import {
  FlowLayoutHeader,
  type FlowLayoutHeaderProps,
} from './FlowLayoutHeader';
import { LayoutChromeContext } from '../common/LayoutChromeContext';

import { type Props } from './types';

/** Fade of the header/footer content when a step publishes new chrome. */
const CHROME_FADE_MS = 200;
import { _FlowLayoutContentColumn, _FlowLayoutScrollViewport } from './styles';
import { IS_DEV } from 'config';
import { useNavigation } from 'globals/context/NavigationContext';

/**
 * FlowLayout
 *
 * Purpose:
 * A page layout that provides an optional header, banner, scrollable content viewport, and optional footer.
 * The content area expands to fill available space and stacks children vertically.
 *
 * Usage:
 * - Pass `header` as a React node or `FlowLayoutHeaderProps` to render a standard header.
 * - Use `banner` for transient notices above the content.
 * - Provide `footer` as a React node or configuration; set `fixedFooter` to keep it docked.
 * - Control spacing with `paddingBlock` and `paddingInline`.
 * - Constrain content with `maxWidth` and `backgroundColor` / `gradient`.
 * - `stickyHeader` keeps the header pinned while scrolling (default: true).
 * - Flow pages always scroll via FlowLayout's inner viewport (`data-app-scroller="flow"`).
 *   While mounted, FlowLayout binds `NavigationContext.scrollRef` to this viewport.
 * - `contentFlexProps` are forwarded to the inner Flex that wraps the page content.
 *   The wrapper defaults to `style.flex = 1` so the content grows to fill the area; override via `contentFlexProps.style`.
 *
 * Example:
 * <FlowLayout header={{ title: 'Settings' }} footer={<MyFooter/>} contentFlexProps={{ gap: 'lg' }}>
 *   <Section />
 * </FlowLayout>
 */
export const FlowLayout: React.FC<Props> = ({
  children,
  banner,
  header,
  footer,
  showHeader = true,
  showFooter = true,
  paddingBlock = 'clamp(32px, 4vw, 128px)',
  paddingInline = 'clamp(24px, 3vw, 64px)',
  contentInnerClassName,
  contentFlexProps,
  contentRef,
  scrollLockForMs,
  scrollInitiallyLocked = false,
}) => {
  const resolvedHeader = useMemo(() => {
    if (!showHeader || !header) return undefined;
    if (isValidElement(header)) return header;
    const h = header as FlowLayoutHeaderProps;
    return <FlowLayoutHeader {...h} />;
  }, [header, showHeader]);

  const resolvedFooter = useMemo(
    () => resolveFooter(footer, showFooter),
    [footer, showFooter],
  );

  // Publish header/footer into the persistent shell (MainLayout) via context.
  // Their fade obeys reduced motion like every other transition.
  const { registerChrome, unregisterChrome } = useContext(LayoutChromeContext);
  const ownerTokenRef = useRef(Symbol('flow-layout-owner'));
  const ownerToken = ownerTokenRef.current;
  const role = useContext(OverlayRoleContext);
  const canPublish = role !== 'exit';

  const shellHeader = useMemo(
    () =>
      resolvedHeader ? (
        <div
          data-flow-header
          data-allow-fade
          style={{
            ['--transition-duration' as string]: `${getAccessibleDuration(CHROME_FADE_MS)}ms`,
            ['--transition-easing' as string]: 'ease',
          }}
        >
          {resolvedHeader}
        </div>
      ) : null,
    [resolvedHeader],
  );

  const shellFooter = useMemo(
    () =>
      resolvedFooter ? (
        <div
          data-flow-footer
          data-allow-fade
          style={{
            ['--transition-duration' as string]: `${getAccessibleDuration(CHROME_FADE_MS)}ms`,
            ['--transition-easing' as string]: 'ease',
          }}
        >
          {resolvedFooter}
        </div>
      ) : null,
    [resolvedFooter],
  );

  const [scrollLocked, setScrollLocked] = React.useState(
    scrollInitiallyLocked || Boolean(scrollLockForMs),
  );

  const { blockNavigation, scrollRef } = useNavigation();

  React.useEffect(() => {
    if (!scrollLockForMs) return;
    setScrollLocked(true);
    blockNavigation(scrollLockForMs);
    const id = window.setTimeout(() => {
      setScrollLocked(false);
    }, scrollLockForMs);
    return () => window.clearTimeout(id);
  }, [scrollLockForMs, blockNavigation]);

  useEffect(() => {
    if (!canPublish) return;
    registerChrome(ownerToken, {
      header: shellHeader,
      footer: shellFooter,
    });
  }, [canPublish, ownerToken, shellHeader, shellFooter, registerChrome]);

  useEffect(() => {
    return () => {
      unregisterChrome(ownerToken);
    };
  }, [ownerToken, unregisterChrome]);

  const { style: userStyle, ...restContentFlexProps } = contentFlexProps ?? {};

  const scrollViewportRef = React.useRef<HTMLDivElement | null>(null);
  const prevScrollRefEl = React.useRef<HTMLElement | null>(null);
  useEffect(() => {
    prevScrollRefEl.current = scrollRef.current;
    const el = scrollViewportRef.current as unknown as HTMLElement | null;
    if (el) scrollRef.current = el;
    return () => {
      if (scrollRef.current === el) {
        scrollRef.current = prevScrollRefEl.current;
      } else {
        if (IS_DEV) {
          console.warn(
            '[FlowLayout] scrollRef changed by another owner while FlowLayout was mounted. Not restoring to avoid clobbering.',
          );
        }
      }
    };
  }, [scrollRef]);

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    const el = scrollViewportRef.current;
    if (!el) {
      console.warn(
        '[FlowLayout] Missing flow scroll viewport. Scroll ownership contract cannot be enforced.',
      );
      return;
    }

    if (el.dataset.appScroller !== 'flow') {
      console.warn(
        '[FlowLayout] Scroll viewport must be tagged with data-app-scroller="flow".',
      );
    }

    const transform = window.getComputedStyle(el).transform;
    if (transform && transform !== 'none') {
      console.warn(
        '[FlowLayout] Flow scroll viewport must remain transform-free. Move route transforms to [data-center-content].',
      );
    }
  }, []);

  return (
    <LayoutTransitionContainer
      className={contentInnerClassName}
      data-center-content
      data-allow-motion
    >
      <LayoutTransitionContainerInner>
        {banner}
        <_FlowLayoutScrollViewport
          ref={scrollViewportRef}
          data-app-scroller="flow"
          $scrollLocked={scrollLocked}
        >
          <_FlowLayoutContentColumn
            ref={contentRef}
            $paddingInline={paddingInline}
            $paddingBlock={paddingBlock}
            direction="column"
            gap="md"
            justifyContent="flex-start"
            alignItems="flex-start"
            style={{
              ...(userStyle ?? {}),
            }}
            {...restContentFlexProps}
          >
            {children}
          </_FlowLayoutContentColumn>
        </_FlowLayoutScrollViewport>
      </LayoutTransitionContainerInner>
    </LayoutTransitionContainer>
  );
};

export type {
  FooterProp as FlowLayoutFooterProp,
  HeaderProp as FlowLayoutHeaderProp,
  Props as FlowLayoutProps,
} from './types';
