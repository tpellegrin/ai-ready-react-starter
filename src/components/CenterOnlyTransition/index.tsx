import React from 'react';

import { TRANSITIONS, prefersReducedMotion } from 'utils/transitions/config';
import { OverlayRoleContext } from './OverlayRoleContext';

import { CenterPhase, Props } from './types';
import { useCenterOnlyTransitionLogic } from './logic';
import {
  _CenterOnlyTransitionRoot,
  _CenterOnlyTransitionScene,
} from './styles';
import { useNavigation } from 'globals/context/NavigationContext';

export const CenterOnlyTransition = ({
  children,
  routeKey,
  direction,
  duration = TRANSITIONS.duration.default,
  easing = TRANSITIONS.easing.smooth,
}: Props) => {
  const reduceMotion = prefersReducedMotion();
  const { scrollRef, navEpoch } = useNavigation();

  // Single-mount active page
  const [active, setActive] = React.useState<{
    key: string;
    node: React.ReactNode;
  }>(() => ({
    key: routeKey,
    node: children,
  }));
  // Previous page overlay during exit
  const [exitOverlay, setExitOverlay] = React.useState<React.ReactNode | null>(
    null,
  );

  // Explicit phase (prevents mid-sequence re-arms)
  const [phase, setPhase] = React.useState<CenterPhase>('settled');

  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = React.useRef<HTMLDivElement | null>(null);
  const exitRef = React.useRef<HTMLDivElement | null>(null);
  const [activeOverlay, setActiveOverlay] = React.useState(false);
  const [transitionEpoch, setTransitionEpoch] = React.useState(navEpoch);
  const hasSettledOnceRef = React.useRef(false);
  const lastFocusedEpochRef = React.useRef(transitionEpoch);

  // On route change: lock height, reset scroll, swap nodes, set overlay phase
  React.useEffect(() => {
    if (active.key === routeKey) return;

    const el = stageRef.current;
    if (el) {
      // Lock to the actual center viewport height (the real scroller),
      // falling back to the current stage height if unavailable.
      const viewport = scrollRef.current;
      const h = viewport?.clientHeight || el.offsetHeight;
      el.style.height = `${h}px`;
    }

    // Deterministic flow scroll policy: reset to top instantly
    const scroller = scrollRef.current;
    if (scroller && typeof scroller.scrollTo === 'function') {
      try {
        // 'instant' is widely supported but not in lib.dom ScrollBehavior typing.
        scroller.scrollTo({
          left: 0,
          top: 0,
          behavior: 'instant' as ScrollBehavior,
        });
      } catch {
        // Fallback if browser rejects unknown behavior value
        scroller.scrollTo(0, 0);
      }
    }

    setExitOverlay(active.node);
    setActive({ key: routeKey, node: children });
    setActiveOverlay(true);
    setPhase('overlay');
    setTransitionEpoch(navEpoch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, navEpoch]);

  // Keep the cached active node fresh on same-route rerenders.
  React.useEffect(() => {
    if (active.key !== routeKey) return;
    setActive((prev) => {
      if (prev.key !== routeKey) return prev;
      if (prev.node === children) return prev;
      return {
        ...prev,
        node: children,
      };
    });
  }, [active.key, children, routeKey]);

  // Drive the animation; includes fallback+watchdog and zero-flicker finalize
  useCenterOnlyTransitionLogic({
    transitionEpoch,
    activeOverlay,
    exitOverlay,
    setActiveOverlay,
    setExitOverlay,
    setPhase,
    duration,
    easing,
    direction,
    reduceMotion,
    stageRef,
    activeRef,
    exitRef,
  });

  // Ensure exit overlay is inert/hidden from a11y while present
  React.useEffect(() => {
    const node = exitRef.current as unknown as HTMLElement | null;
    if (!node) return;
    if (!exitOverlay) return;
    try {
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    } catch {}
    return () => {
      try {
        node.removeAttribute('inert');
        node.removeAttribute('aria-hidden');
      } catch {}
    };
  }, [exitOverlay]);

  // After settle, move focus safely into the active scene if focus is elsewhere
  React.useEffect(() => {
    if (phase !== 'settled') return;
    if (!hasSettledOnceRef.current) {
      hasSettledOnceRef.current = true;
      lastFocusedEpochRef.current = transitionEpoch;
      return;
    }
    if (lastFocusedEpochRef.current === transitionEpoch) return;

    const container = activeRef.current as HTMLElement | null;
    if (!container) return;
    const ae = document.activeElement as HTMLElement | null;
    if (ae && container.contains(ae)) {
      lastFocusedEpochRef.current = transitionEpoch;
      return;
    }

    const focusable = container.querySelector<HTMLElement>(
      '[data-route-focus], [autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    let removeFallbackTabIndex = false;
    try {
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus({ preventScroll: true });
      } else {
        container.setAttribute('tabindex', '-1');
        removeFallbackTabIndex = true;
        container.focus({ preventScroll: true });
      }
    } catch {}
    if (removeFallbackTabIndex) {
      container.removeAttribute('tabindex');
    }
    lastFocusedEpochRef.current = transitionEpoch;
  }, [phase, transitionEpoch]);

  return (
    <_CenterOnlyTransitionRoot ref={stageRef} data-center-phase={phase}>
      {/* Active scene (single mount). Renders as overlay during entering, then static. */}
      <OverlayRoleContext.Provider value={activeOverlay ? 'active' : 'static'}>
        <_CenterOnlyTransitionScene
          ref={activeRef}
          $overlay={activeOverlay}
          data-overlay={activeOverlay ? 'enter' : undefined}
          style={{ zIndex: activeOverlay ? 3 : 1 }}
          data-allow-motion={phase === 'overlay' ? true : undefined}
        >
          {active.node}
        </_CenterOnlyTransitionScene>
      </OverlayRoleContext.Provider>

      {/* Exit overlay: previous page slides out */}
      {exitOverlay ? (
        <OverlayRoleContext.Provider value="exit">
          <_CenterOnlyTransitionScene
            ref={exitRef}
            $overlay={true}
            data-overlay="exit"
            style={{ zIndex: 2 }}
            data-allow-motion={phase === 'overlay' ? true : undefined}
            aria-hidden="true"
          >
            {exitOverlay}
          </_CenterOnlyTransitionScene>
        </OverlayRoleContext.Provider>
      ) : null}
    </_CenterOnlyTransitionRoot>
  );
};
