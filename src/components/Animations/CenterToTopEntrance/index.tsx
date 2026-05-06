// /src/components/Animations/CenterToTopEntrance/index.tsx
import React, {
  useEffect,
  useRef,
  useState,
  cloneElement,
  PropsWithChildren,
} from 'react';

import { FromBelowReveal } from '@components/Animations/FromBelowReveal';
import {
  prefersReducedMotion,
  getAccessibleDuration,
} from 'utils/transitions/config';
import { OverlayRoleContext } from 'components/CenterOnlyTransition/OverlayRoleContext';
import { useNavigation } from 'globals/context/NavigationContext';

import {
  _CenterToTopEntranceRoot,
  _CenterToTopEntranceStatic,
  _CenterToTopEntranceOverlay,
} from './styles';
import { Props } from './types';

const useIsoLE =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export const CenterToTopEntrance = ({
  children,
  overlayContent,
  delayMs = 1200,
  durationMs = 400,
  easing = 'ease-in-out',
  viewportEl = null,
  className,
  style,
  onDone,
  skipHold = false,
}: PropsWithChildren<Props>) => {
  const overlayRole = React.useContext(OverlayRoleContext);
  const isExit = overlayRole === 'exit';
  const reduced = prefersReducedMotion();
  const { scrollRef } = useNavigation();

  const [phase, setPhase] = useState<'center' | 'shifting' | 'done'>(() =>
    reduced || isExit || skipHold ? 'done' : 'center',
  );

  // Viewport height = real app scroller; excludes persistent header/footer
  const [stageH, setStageH] = useState<number | null>(null);
  const getViewportEl = () => viewportEl ?? scrollRef?.current ?? null;

  useIsoLE(() => {
    if (phase === 'done' || isExit) {
      setStageH(null);
      return;
    }

    const vp = getViewportEl();
    const readH = () => (vp ? vp.clientHeight : window.innerHeight);

    let raf = 0;
    const apply = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setStageH(readH()));
    };
    apply();

    let ro: ResizeObserver | null = null;
    const onResize = () => apply();
    if (vp && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(apply);
      ro.observe(vp);
    } else {
      window.addEventListener('resize', onResize);
      window.visualViewport?.addEventListener('resize', onResize);
    }
    const late = setTimeout(apply, 0);

    return () => {
      clearTimeout(late);
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [phase, isExit, viewportEl, scrollRef?.current]);

  // Hold → animate
  useEffect(() => {
    if (isExit || phase !== 'center') return;
    const id = window.setTimeout(() => setPhase('shifting'), delayMs);
    return () => window.clearTimeout(id);
  }, [phase, delayMs, isExit]);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const staticRef = useRef<HTMLDivElement | null>(null);

  // Cross-element vertical FLIP (no container reflow; overlay stays centered)
  useIsoLE(() => {
    if (isExit || phase !== 'shifting') return;

    const from = overlayRef.current;
    const to = staticRef.current;
    if (!from || !to) {
      setPhase('done');
      return;
    }

    const eff = getAccessibleDuration(durationMs);
    if (reduced || eff <= 0) {
      setPhase('done');
      return;
    }

    const r1 = from.getBoundingClientRect();
    const r2 = to.getBoundingClientRect();
    const dy = r2.top - r1.top;

    // Start at center
    from.style.willChange = 'transform';
    from.style.transition = 'none';
    from.style.transform = 'translate3d(0, 0, 0)';

    // Two RAFs improves reliability (Safari/FF)
    requestAnimationFrame(() => {
      // Measure once to flush styles

      from.getBoundingClientRect();
      requestAnimationFrame(() => {
        from.style.transition = `transform ${eff}ms ${easing}`;
        from.style.transform = `translate3d(0, ${dy}px, 0)`; // 0 → dy (toward static hero)
      });
    });

    let ended = false;
    const finalize = () => {
      if (ended) return;
      ended = true;
      from.style.transition = '';
      from.style.transform = '';
      from.style.willChange = '';
      setPhase('done');
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') finalize();
    };

    from.addEventListener('transitionend', onEnd);
    const watchdog = window.setTimeout(finalize, eff + 200);

    return () => {
      from.removeEventListener('transitionend', onEnd);
      window.clearTimeout(watchdog);
    };
  }, [phase, isExit, durationMs, easing, reduced]);

  // If we become exit layer mid-flight, settle
  useEffect(() => {
    if (isExit && phase !== 'done') setPhase('done');
  }, [isExit, phase]);

  // onDone once
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const doneFired = useRef(false);
  useEffect(() => {
    if (phase === 'done' && !isExit && !doneFired.current) {
      doneFired.current = true;
      onDoneRef.current?.();
    }
  }, [phase, isExit]);

  const overlay = overlayContent ?? cloneElement(children, {});
  const showOverlay = !isExit && phase !== 'done';

  return (
    <_CenterToTopEntranceRoot
      className={className}
      style={{
        minHeight: showOverlay ? (stageH ?? undefined) : undefined,
        ...style,
      }}
    >
      {/* Static hero in normal flow; hidden until done */}
      <_CenterToTopEntranceStatic
        $visible={isExit || phase === 'done'}
        $interactive={!showOverlay}
      >
        <div data-static-hero data-flip-target ref={staticRef}>
          {children}
        </div>
      </_CenterToTopEntranceStatic>

      {/* Overlay stays centered for the entire run; no justifyContent flip */}
      {showOverlay && (
        <_CenterToTopEntranceOverlay>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // <— keep centered throughout
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <div data-item>
              <div ref={overlayRef} data-flip-target data-allow-motion>
                <FromBelowReveal delayMs={200}>{overlay}</FromBelowReveal>
              </div>
            </div>
          </div>
        </_CenterToTopEntranceOverlay>
      )}
    </_CenterToTopEntranceRoot>
  );
};
