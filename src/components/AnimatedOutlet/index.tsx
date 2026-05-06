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
} from 'containers/Layouts/common/LayoutTransitionContainer/types';
import { getAccessibleDuration } from 'utils/transitions/config';
import { useNavigation } from 'globals/context/NavigationContext';
import { useTransition } from 'hooks/useTransition';
import { useScrollManagement } from 'hooks/useScrollManagement';
import { ErrorBoundary } from 'components/ErrorBoundary';
import { Wrapper, Stage } from './styles';

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

  // Latch and mirror transition when navigation key changes; force Fade globally
  useEffect(() => {
    if (lastKeyRef.current !== location.key) {
      registerNavigationCommit(location.key);
      const next = TransitionType.fade;
      setActiveTransition(next);
      lastKeyRef.current = location.key;

      // Clear any pending auto-clear timer
      if (transitionClearTimeoutRef.current) {
        window.clearTimeout(transitionClearTimeoutRef.current);
        transitionClearTimeoutRef.current = null;
      }

      setTransition(next);

      // If we're inside the Flow (stable transition key prevents onExited),
      // schedule an explicit clear so NavigationContext.transition doesn't stay latched.
      const isFlow = location.pathname.startsWith('/flow/');
      if (isFlow) {
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
    location.key,
    location.pathname,
    setTransition,
    registerNavigationCommit,
  ]);

  const onEnter = useCallback(() => {
    // Reset scroll on a new route unless restored during entering.
    scrollToTop();
  }, [scrollToTop]);

  const onEntering = useCallback(() => {
    // Restore the scroll position if this route persisted it.
    restoreScrollPosition(location.pathname);
  }, [restoreScrollPosition, location.pathname]);

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
    // eslint-disable-next-line no-console
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

  // Use a stable key for Flow routes so top-level fade does not run within the flow
  const isFlowRoute = location.pathname.startsWith('/flow/');
  const transitionKey = isFlowRoute ? '__flow__' : location.key;

  const content = (
    <Stage
      className="routes-stage"
      data-route-transition={activeTransition ?? TransitionType.fade}
    >
      <TransitionGroup component={null}>
        <CSSTransition
          key={transitionKey}
          nodeRef={getNodeRef(transitionKey)}
          timeout={getAccessibleDuration(DURATION_MS)}
          classNames={TRANSITION_CLASS}
          onEnter={onEnter}
          onEntering={onEntering}
          onExited={() => onExited(transitionKey)}
        >
          <Wrapper
            ref={getNodeRef(transitionKey)}
            className={getClassName(TRANSITION_CLASS)}
            style={transitionStyle}
            data-testid="animated-outlet-container"
            aria-live="polite"
            data-allow-motion
          >
            {outlet}
          </Wrapper>
        </CSSTransition>
      </TransitionGroup>
    </Stage>
  );

  if (hasTransitionError) return content;

  return (
    <ErrorBoundary fallback={content} onError={handleTransitionError}>
      {content}
    </ErrorBoundary>
  );
};
