import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  createRef,
} from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import {
  DURATION_MS,
  TRANSITION_CLASS,
  TransitionType,
  getAccessibleDuration,
} from 'utils/transitions/config';
import { useNavigation } from 'globals/context/NavigationContext';
import { useTransition } from 'hooks/useTransition';
import { useScrollManagement } from 'hooks/useScrollManagement';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { _AnimatedOutletWrapper, _AnimatedOutletStage } from './styles';

/**
 * AnimatedOutlet mounts route content with CSS transitions,
 * pre-renders both exiting and entering pages to animate concurrently,
 * syncs computed transition into NavigationContext, and manages scroll.
 */
export const AnimatedOutlet = () => {
  const outlet = useOutlet();
  const location = useLocation();

  const { setTransition, registerNavigationCommit } = useNavigation();
  const { shouldReduceMotion } = useTransition();
  const { scrollToTop, restoreScrollPosition } = useScrollManagement();

  const [hasTransitionError, setHasTransitionError] = useState(false);
  // Latch transition per navigation key to avoid mid-flight class drops
  const [activeTransition, setActiveTransition] =
    useState<TransitionType | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const transitionClearTimeoutRef = useRef<number | null>(null);

  // Map of nodeRefs per transition key (required by react-transition-group in StrictMode)
  const nodeRefs = useRef(
    new Map<string, React.RefObject<HTMLDivElement | null>>(),
  );
  const getNodeRef = (key: string): React.RefObject<HTMLDivElement | null> => {
    let ref = nodeRefs.current.get(key);
    if (!ref) {
      ref = createRef<HTMLDivElement | null>();
      nodeRefs.current.set(key, ref);
    }
    return ref;
  };

  // Non-flow pages transition when the pathname changes; a search-only change
  // (e.g. `?status=` filters) is in-page state and must not remount the page
  // or steal focus. Flow steps keep per-navigation keys (see below).
  const isFlowRoute = location.pathname.startsWith('/flow/');
  const navigationKey = isFlowRoute ? location.key : location.pathname;

  // Latch and mirror transition when the page changes; force Fade globally
  useEffect(() => {
    const isFirstLoad = lastKeyRef.current === null;

    if (lastKeyRef.current !== navigationKey) {
      registerNavigationCommit(location.key);
      const next = TransitionType.fade;
      setActiveTransition(next);
      lastKeyRef.current = navigationKey;

      // Clear any pending auto-clear timer
      if (transitionClearTimeoutRef.current) {
        window.clearTimeout(transitionClearTimeoutRef.current);
        transitionClearTimeoutRef.current = null;
      }

      // Only apply global transition state if this is a subsequent navigation.
      // Initial load should not lock scroll or apply transition classes to the shell.
      if (!isFirstLoad) {
        setTransition(next);
      }

      // If we're inside the Flow (stable transition key prevents onExited),
      // schedule an explicit clear so NavigationContext.transition doesn't stay latched.
      if (isFlowRoute && !isFirstLoad) {
        transitionClearTimeoutRef.current = window.setTimeout(() => {
          setTransition(null);
          transitionClearTimeoutRef.current = null;
        }, getAccessibleDuration(DURATION_MS));
      }
    }

    return () => {
      if (transitionClearTimeoutRef.current) {
        window.clearTimeout(transitionClearTimeoutRef.current);
        transitionClearTimeoutRef.current = null;
      }
    };
  }, [
    navigationKey,
    isFlowRoute,
    location.key,
    setTransition,
    registerNavigationCommit,
  ]);

  const onEnter = useCallback(
    (key: string) => {
      // Going back mid-fade re-enters the exiting node: expose it again.
      const node = nodeRefs.current.get(key)?.current;
      node?.removeAttribute('inert');
      node?.removeAttribute('aria-hidden');
      // Reset scroll on a new route unless restored during entering.
      scrollToTop();
    },
    [scrollToTop],
  );

  const onEntering = useCallback(() => {
    // Restore the scroll position if this route persisted it.
    restoreScrollPosition(location.pathname);
  }, [restoreScrollPosition, location.pathname]);

  const onEntered = useCallback(() => {
    setActiveTransition(null);
    setTransition(null);
  }, [setTransition]);

  // The exiting page stays visible while it fades out; keep it out of the
  // accessibility tree and unfocusable meanwhile (one page, one main).
  const onExit = useCallback((key: string) => {
    const node = nodeRefs.current.get(key)?.current;
    node?.setAttribute('inert', '');
    node?.setAttribute('aria-hidden', 'true');
  }, []);

  const onExited = useCallback(
    (key: string) => {
      // Clean up nodeRef for old page and clear transition state
      nodeRefs.current.delete(key);
      setActiveTransition(null);
      setTransition(null);
    },
    [setTransition],
  );

  const handleTransitionError = useCallback((error: Error) => {
    console.error('Transition error:', error);
    setHasTransitionError(true);
  }, []);

  const getClassName = (base: string) => {
    // Variant is now controlled at the Stage level via data-route-transition
    const reduced =
      activeTransition && shouldReduceMotion ? `${base}--reduced-motion` : '';
    return [base, reduced].filter(Boolean).join(' ').trim();
  };

  const transitionStyle: React.CSSProperties &
    Record<'--route-transition-duration', string> = {
    '--route-transition-duration': `${getAccessibleDuration(DURATION_MS)}ms`,
  };

  // Use a stable key for Flow routes so top-level fade does not run within the
  // flow; other pages are keyed by pathname (search changes stay in-page).
  const transitionKey = isFlowRoute ? '__flow__' : location.pathname;

  const content = (
    <_AnimatedOutletStage
      className="routes-stage"
      data-route-transition={activeTransition ?? TransitionType.fade}
    >
      <TransitionGroup component={null}>
        <CSSTransition
          key={transitionKey}
          nodeRef={getNodeRef(transitionKey)}
          timeout={getAccessibleDuration(DURATION_MS)}
          classNames={TRANSITION_CLASS}
          onEnter={() => onEnter(transitionKey)}
          onEntering={onEntering}
          onEntered={onEntered}
          onExit={() => onExit(transitionKey)}
          onExited={() => onExited(transitionKey)}
        >
          <_AnimatedOutletWrapper
            ref={getNodeRef(transitionKey)}
            className={getClassName(TRANSITION_CLASS)}
            style={transitionStyle}
            data-testid="animated-outlet-container"
            aria-live="polite"
            data-allow-motion
          >
            {outlet}
          </_AnimatedOutletWrapper>
        </CSSTransition>
      </TransitionGroup>
    </_AnimatedOutletStage>
  );

  if (hasTransitionError) return content;

  return (
    <ErrorBoundary fallback={content} onError={handleTransitionError}>
      {content}
    </ErrorBoundary>
  );
};

/** Slide variant for flow steps (used by the flow shell). */
export { CenterAnimatedOutlet } from './CenterAnimatedOutlet';
