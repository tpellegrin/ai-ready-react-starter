import React from 'react';

import { HookConfig } from './types';

const getAnimatedTarget = (root: HTMLElement | null): HTMLElement | null => {
  if (!root) return null;
  const content = root.querySelector('[data-center-content]');
  if (!content) {
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[CenterOnlyTransition] Expected [data-center-content] inside the scene. Falling back to scene root. This may broaden transform scope.',
      );
    }
  }
  return (content as HTMLElement) ?? root;
};

export function useCenterOnlyTransitionLogic(cfg: HookConfig) {
  const {
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
  } = cfg;

  const activeTxnRef = React.useRef<number | null>(null);
  const finalizingTxnRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  React.useLayoutEffect(() => {
    if (!activeOverlay && !exitOverlay) return;

    const txnId = transitionEpoch;
    if (activeTxnRef.current === txnId) return;
    activeTxnRef.current = txnId;

    const activeNode = activeRef.current;
    const exitNode = exitRef.current;
    const enterTarget = getAnimatedTarget(activeNode);
    const exitTarget = getAnimatedTarget(exitNode);

    const effectiveDuration = reduceMotion ? 0 : duration;

    const animatedElements: HTMLElement[] = [];
    if (enterTarget) animatedElements.push(enterTarget);
    if (exitTarget) animatedElements.push(exitTarget);

    const rafIds: number[] = [];
    const listeners: Array<{
      element: HTMLElement;
      handler: (e: Event) => void;
    }> = [];
    let fallbackTimer: number | null = null;
    let watchdogTimer: number | null = null;
    let didFinalize = false;

    const isCurrentTxn = () => activeTxnRef.current === txnId;

    const unlockStage = () => {
      const stageEl = stageRef.current;
      if (!stageEl) return;
      stageEl.style.height = '';
      stageEl.style.minHeight = '';
    };

    const cleanupAnimatedStyles = () => {
      for (const element of animatedElements) {
        element.style.transition = '';
        element.style.willChange = '';
        element.style.backfaceVisibility = '';
        element.style.removeProperty('--transition-duration');
        element.style.removeProperty('--transition-easing');
      }

      if (enterTarget) {
        enterTarget.style.willChange = 'auto';
      }

      if (activeNode) {
        activeNode.style.transition = '';
        activeNode.style.animation = '';
      }
    };

    const clearResources = () => {
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (watchdogTimer !== null) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }

      for (const { element, handler } of listeners) {
        element.removeEventListener('transitionend', handler);
      }
      listeners.length = 0;
    };

    const cancelPendingFrames = () => {
      for (const id of rafIds) {
        window.cancelAnimationFrame(id);
      }
      rafIds.length = 0;
    };

    const queueFrame = (fn: () => void) => {
      const id = window.requestAnimationFrame(fn);
      rafIds.push(id);
    };

    // No-motion path (still unlock height & settle)
    if (effectiveDuration <= 0) {
      clearResources();
      cleanupAnimatedStyles();
      setActiveOverlay(false);
      setExitOverlay(null);
      unlockStage();
      setPhase('settled');
      if (activeTxnRef.current === txnId) {
        activeTxnRef.current = null;
      }
      return;
    }

    for (const element of animatedElements) {
      element.style.setProperty(
        '--transition-duration',
        `${effectiveDuration}ms`,
      );
      element.style.setProperty('--transition-easing', `${easing}`);
      element.style.willChange = 'transform';
      element.style.backfaceVisibility = 'hidden';
    }

    const outX = -direction * 100;
    const inX = direction * 100;

    // 1) Start with no transition (CSS keeps enter offscreen by default)
    if (exitTarget) {
      exitTarget.style.transition = 'none';
      exitTarget.style.transform = 'translate3d(0, 0, 0)';
    }
    if (enterTarget) {
      enterTarget.style.transition = 'none';
      enterTarget.style.transform = `translate3d(${inX}%, 0, 0)`;
    }

    // 2) Reflow — still inside layout effect, before paint
    if (enterTarget) void enterTarget.getBoundingClientRect();
    if (exitTarget) void exitTarget.getBoundingClientRect();

    // 3) Apply final transforms with transition — animation starts immediately on first paint
    if (exitTarget) {
      exitTarget.style.transition = `transform var(--transition-duration) var(--transition-easing)`;
      exitTarget.style.transform = `translate3d(${outX}%, 0, 0)`;
    }
    if (enterTarget) {
      enterTarget.style.transition = `transform var(--transition-duration) var(--transition-easing)`;
      enterTarget.style.transform = 'translate3d(0, 0, 0)';
    }

    let finishedCount = 0;
    const expectedEnds = animatedElements.length;

    const finalize = () => {
      if (didFinalize) return;
      didFinalize = true;
      clearResources();

      if (!mountedRef.current || !isCurrentTxn()) {
        return;
      }

      finalizingTxnRef.current = txnId;

      const stageEl = stageRef.current;
      if (stageEl) {
        const measured = stageEl.offsetHeight;
        stageEl.style.minHeight = `${measured}px`;
      }

      if (enterTarget) enterTarget.style.willChange = 'transform';

      // T+1 remove exit
      queueFrame(() => {
        if (!mountedRef.current || !isCurrentTxn()) return;
        setExitOverlay(null);

        // T+2 demote active; freeze transitions
        queueFrame(() => {
          if (!mountedRef.current || !isCurrentTxn()) return;
          if (activeNode) {
            activeNode.style.transition = 'none';
            activeNode.style.animation = 'none';
            void activeNode.getBoundingClientRect();
          }
          if (enterTarget) {
            enterTarget.style.transition = 'none';
            enterTarget.style.transform = 'translate3d(0, 0, 0)';
            void enterTarget.getBoundingClientRect();
          }
          setActiveOverlay(false);

          // T+3 unlock + cleanup
          queueFrame(() => {
            if (!mountedRef.current || !isCurrentTxn()) return;

            unlockStage();
            cleanupAnimatedStyles();
            setPhase('settled');
            if (activeTxnRef.current === txnId) {
              activeTxnRef.current = null;
            }
            if (finalizingTxnRef.current === txnId) {
              finalizingTxnRef.current = null;
            }
          });
        });
      });
    };

    const handleTransitionEnd = (e: Event) => {
      if (!isCurrentTxn()) return;
      const transitionEvent = e as TransitionEvent;
      if (transitionEvent.propertyName !== 'transform') return;
      finishedCount += 1;
      if (finishedCount >= expectedEnds) finalize();
    };

    if (expectedEnds === 0) {
      finalize();
      return () => {
        clearResources();
        cancelPendingFrames();
        if (activeTxnRef.current === txnId) {
          activeTxnRef.current = null;
        }
        if (finalizingTxnRef.current === txnId) {
          finalizingTxnRef.current = null;
        }
      };
    }

    for (const element of animatedElements) {
      element.addEventListener('transitionend', handleTransitionEnd);
      listeners.push({ element, handler: handleTransitionEnd });
    }

    // Timers (cleaned up in return)
    fallbackTimer = window.setTimeout(finalize, effectiveDuration + 50);
    watchdogTimer = window.setTimeout(() => {
      if (!isCurrentTxn()) return;
      if (activeTxnRef.current === txnId) {
        // eslint-disable-next-line no-console
        console.warn(
          '[CenterOnlyTransition] Animation exceeded expected duration; forcing finalize.',
        );
        finalize();
      }
    }, effectiveDuration + 200);

    return () => {
      const isFinalizingTxn = finalizingTxnRef.current === txnId;

      if (isFinalizingTxn) {
        return;
      }

      clearResources();
      cancelPendingFrames();
      cleanupAnimatedStyles();
      unlockStage();

      if (activeTxnRef.current === txnId) {
        activeTxnRef.current = null;
      }
    };
  }, [
    transitionEpoch,
    activeOverlay,
    exitOverlay,
    duration,
    easing,
    direction,
    reduceMotion,
    setActiveOverlay,
    setExitOverlay,
    setPhase,
    stageRef,
    activeRef,
    exitRef,
  ]);
}
