### Animation System Architecture

### Overview
This document is the authoritative, code‑grounded reference for all motion in the app. It covers where transitions and reveals are mounted, how they animate, how layout shells coordinate to avoid remounts and flicker, the global transition clamp, accessibility concerns, verification, and guardrails.

Core principles:
- Route/page transitions
    - Non‑flow routes: CSS transitions via react-transition-group in `AnimatedOutlet`. Current policy: fade‑only for non‑flow routes (LTR/RTL variants exist in CSS but are not used).
    - Flow routes: single‑mount, dual slide (enter+exit) center transitions via `CenterOnlyTransition` using JS‑driven `translate3d` transforms.
- Element‑level reveals
    - `FromBelowReveal` transitions on `transform, opacity`, arms on mount/`in === true`. Reveals inside an exit overlay start visible immediately with zero delay.
- Layout position motion (FLIP)
    - `LayoutPositionAnimator` + `useFlipLayout`: transform‑only repositioning of children using the FLIP technique; honors the global clamp via `data-allow-motion` and local `--transition-*` vars.
    - `CenterToTopEntrance`: one‑shot entrance where a hero block appears centered, then slides to the top using FLIP; subsequent content animates normally (use `onDone` to gate reveals) and the entrance short‑circuits on exit overlays.
- Global motion policy
    - Variable‑driven transition clamp in `styles/global.ts` prevents accidental `transition: all`; animated elements opt in via `data-allow-*` and set local `--transition-*` timing.
- Layout shells
    - Header/footer render once in a persistent shell and never slide; the progress bar animates width there; only the center content is animated during flow transitions.

### Terminology
- Flow vs. Non‑Flow routes
    - Flow routes: pages under `/flow/*`, animated by `CenterOnlyTransition` (center‑only dual slide, JS transforms).
    - Non‑flow routes: all other pages, animated by `AnimatedOutlet` (CSS transitions via `TransitionGroup`/`CSSTransition`, fade‑only policy).
- Stage, Scene, Wrapper
    - Stage: outer clipping/stacking container for route transitions (`AnimatedOutlet.Stage`, `CenterOnlyTransition._CenterOnlyTransitionRoot`).
    - Scene: per‑page container within center transitions (`_CenterOnlyTransitionScene`) that can be overlay or static.
    - Wrapper: per‑page container within `AnimatedOutlet` (non‑flow) that receives enter/exit CSS classes.
- Overlay vs. Static states
    - Overlay: `position: absolute` during an active transition (entering or exiting layer).
    - Static: `position: static` in normal flow after finalizing (enter Scene promoted from overlay to static without a remount).
- Clamp and Opt‑in attributes
    - Clamp: global rule limiting `transition-property` to safe defaults and durations via variables; overridden per element via opt‑in attributes and local `--transition-*` variables.
    - Opt‑ins: `data-allow-motion`, `data-allow-width`, `data-allow-size`, `data-allow-fade` adjust `--transition-props` for the animated element under the clamp.
- Reveal and Exit overlay behavior
    - Reveal: element‑level slide/fade (e.g., `FromBelowReveal`) that arms on mount or when `in` becomes true.
    - Exit overlay: when a reveal is rendered within the exit overlay, it becomes visible immediately and any custom reveal delay is forced to `0ms` to avoid late plays.

#### FLIP targets & axis lock
- FLIP targets & axis lock
    - FLIP target: element that receives the transform. If an item contains `[data-flip-target]`, the transform is applied there; otherwise it falls back to the item root. Prevents clobbering existing transforms on the host.
    - Axis lock: `lockAxis="x" | "y"` constrains motion to a single axis (default: no lock). Use `lockAxis="y"` for vertical slides to avoid diagonal drift.
    - Transform composition (opt‑in): when enabled, the animation composes the inverted translate with the element’s computed transform instead of overwriting it. Default: **off** for performance.

### File Tree (animations only)
- `/src/utils/transitions/config.ts`
- `/src/styles/global.ts`
- Route transition layer (non‑flow):
    - `/src/components/AnimatedOutlet/index.tsx`
    - `/src/components/AnimatedOutlet/styles.tsx`
    - `/src/components/AnimatedOutlet/CenterAnimatedOutlet.tsx`
- Center‑only transition (flow):
    - `/src/components/CenterOnlyTransition/index.tsx`
    - `/src/components/CenterOnlyTransition/styles.tsx`
    - `/src/components/CenterOnlyTransition/logic.ts`
    - `/src/components/CenterOnlyTransition/types.ts`
    - `/src/components/CenterOnlyTransition/useFlowCenterDirection.ts`
    - `/src/components/CenterOnlyTransition/OverlayRoleContext.ts`
- Element reveals & layout FLIP:
    - `/src/components/Animations/FromBelowReveal/index.tsx`
    - `/src/components/Animations/FromBelowReveal/styles.ts`
    - `/src/components/Animations/FromBelowReveal/types.ts`
    - `/src/components/Animations/LayoutPositionAnimator/index.tsx`
    - `/src/components/Animations/LayoutPositionAnimator/styles.ts`
    - `/src/components/Animations/LayoutPositionAnimator/types.ts`
    - `/src/components/Animations/CenterToTopEntrance/index.tsx`
    - `/src/components/Animations/CenterToTopEntrance/styles.ts`
    - `/src/components/Animations/CenterToTopEntrance/types.ts`
- Progress bar:
    - `/src/components/Progress/index.tsx`
    - `/src/components/Progress/styles.tsx`
    - `/src/containers/Layouts/common/LayoutProgress/index.tsx`
    - `/src/globals/context/ProgressBar/index.tsx`
- Layouts and shells:
    - `/src/containers/Layouts/Shells/CenterTransitionShell.tsx`
    - `/src/containers/Layouts/MainLayout/index.tsx`
    - `/src/containers/Layouts/MainLayout/types.ts`
    - `/src/containers/Layouts/common/BaseLayout/index.tsx`
    - `/src/containers/Layouts/common/BaseLayout/styles.ts`
    - `/src/containers/Layouts/common/LayoutTransitionContainer/styles.ts`
    - `/src/containers/Layouts/common/LayoutTransitionContainer/types.ts`
    - `/src/containers/Layouts/FlowLayout/index.tsx`
    - `/src/containers/Layouts/common/LayoutChromeContext.tsx`
- Hooks:
    - `/src/hooks/useFlipLayout.ts`
- Router mount point:
    - `/src/containers/AppRouter.tsx`
    - `/src/containers/App.tsx`

Usage examples:
- `/src/views/guest/Welcome/...` (uses `FromBelowReveal`)

### Component Reference

#### AppRouter (mount point for route animation shells)
- Path: `/src/containers/AppRouter.tsx`
- Role: Declares the router tree; mounts `AnimatedOutlet` at root and nests flow routes under `CenterTransitionShell`.
- Key snippet:
```tsx
// /src/containers/AppRouter.tsx
return createBrowserRouter([
  {
    path: '/',
    element: <AnimatedOutlet />,            // non-flow: CSS page transitions (fade-only)
    children: [
      ...nonFlowChildren,
      {
        path: 'flow',
        element: <CenterTransitionShell />, // flow: center-only dual slide
        children: flowChildren,
      },
    ],
  },
]);
```

#### AnimatedOutlet (non‑flow page transitions)
- Path: `/src/components/AnimatedOutlet/index.tsx`
- Purpose: CSS transitions for full pages using `TransitionGroup` + `CSSTransition`. Enforces fade‑only variant for non‑flow routes; uses a stable key inside flows to avoid top‑level fades.
- Structure & lifecycle:
```tsx
// /src/components/AnimatedOutlet/index.tsx
<Stage className="routes-stage" data-route-transition={activeTransition ?? TransitionType.fade}>
  <TransitionGroup component={null}>
    <CSSTransition
      key={transitionKey}                              // '__flow__' for flow; location.key otherwise
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
```
- Styles (selected):
```tsx
// /src/components/AnimatedOutlet/styles.tsx
export const Stage = styled.div`
  --route-transition-duration: ${TRANSITIONS.duration.default}ms;
  position: relative; width: 100%; min-height: 100vh; overflow: hidden;
  contain: layout paint; isolation: isolate;
`;

export const Wrapper = styled.div`
  position: relative; width: 100%; contain: layout paint; isolation: isolate;
  will-change: transform, opacity; backface-visibility: hidden; transform: translateZ(0);
  &.transition-status { transition-property: transform, opacity; transition-duration: var(--route-transition-duration, ${TRANSITIONS.duration.default}ms); transition-timing-function: ${TRANSITIONS.easing.default}; }
  &.transition-status-enter, &.transition-status-enter-active, &.transition-status-exit, &.transition-status-exit-active { position: absolute; inset: 0; height: 100%; transform: translateZ(0); }
  /* ltr/rtl/fade + reduced-motion blocks present; current runtime policy uses fade-only */
`;
```
- Mount policy:
    - `Stage` persists.
    - `TransitionGroup` mounts the entering `Wrapper` and retains the exiting `Wrapper` during exit; after exit completes the exiting child is unmounted. We do not pass `mountOnEnter`/`unmountOnExit` to `CSSTransition`; default behavior applies.
- Keys and flow paths:
    - For non‑flow routes, `key={location.key}` produces a new `Wrapper` per navigation (intentional page remount).
    - For flow routes, `transitionKey === '__flow__'` keeps the top‑level wrapper stable so only the center content animates inside the flow shell (no top‑level fade inside flows). Because onExited won’t fire for a stable key, a timeout clears the latched transition in `NavigationContext`.
- Motion config: Fade (`opacity`) by policy; duration via `--route-transition-duration` local inline style.
- Reduced motion: `&.transition-status--reduced-motion` removes transforms and shortens duration.

#### CenterAnimatedOutlet (flow host)
- Path: `/src/components/AnimatedOutlet/CenterAnimatedOutlet.tsx`
- Purpose: Feeds route key and direction into `CenterOnlyTransition` and clears one‑shot navigation intent.
- Snippet:
```tsx
// /src/components/AnimatedOutlet/CenterAnimatedOutlet.tsx
return (
  <CenterOnlyTransition
    routeKey={key}
    direction={direction}
    duration={TRANSITIONS.duration.default}
    easing={TRANSITIONS.easing.smooth}
  >
    {outlet}
  </CenterOnlyTransition>
);
```

#### CenterOnlyTransition (flow center slides; dual enter+exit, single‑mount enter)
- Path: `/src/components/CenterOnlyTransition/index.tsx`
- Purpose: Animate center content by sliding the entering page in and the exiting page out; entering page mounts once and is promoted overlay→static.
- Height‑lock constraint: On route change, stage height locks to the current viewport scroller height via `NavigationContext.scrollRef` (falls back to stage height). Height is always cleared at finalize.
- Single‑mount guarantee: The enter `Scene(active)` is a true single mount (never recreated); only the `Scene(exit)` overlay is temporary.
- Explicit phase and attributes: Root exposes `data-center-phase` (`'idle' | 'overlay' | 'settled'`). Scenes expose `data-overlay="enter|exit"`. `data-allow-motion` is applied to scenes only while `phase === 'overlay'` to cooperate with the global clamp without arming after settle.
- Layering: z-index 3 (enter overlay), 2 (exit overlay), 1 (static active).
- Key implementation (abridged):
```tsx
// /src/components/CenterOnlyTransition/index.tsx
const [active, setActive] = useState({ key: routeKey, node: children });
const [exitOverlay, setExitOverlay] = useState<React.ReactNode | null>(null);
const [phase, setPhase] = useState<CenterPhase>('settled');
const [activeOverlay, setActiveOverlay] = useState(false);

useEffect(() => {
  if (active.key === routeKey) return;
  const el = stageRef.current;
  if (el) {
    const viewport = scrollRef.current;
    const h = viewport?.clientHeight || el.offsetHeight;
    el.style.height = `${h}px`;                   // height-lock to scroller
  }
  setExitOverlay(active.node);                    // snapshot leaving page
  setActive({ key: routeKey, node: children });   // entering page (single mount)
  setActiveOverlay(true);                         // enter as overlay
  setPhase('overlay');
}, [routeKey]);

useCenterOnlyTransitionLogic({
  activeOverlay, exitOverlay,
  setActiveOverlay, setExitOverlay, setPhase,
  duration, easing, direction, reduceMotion,
  stageRef, activeRef, exitRef,
});

return (
  <_CenterOnlyTransitionRoot ref={stageRef} data-center-phase={phase}>
    <OverlayRoleContext.Provider value={activeOverlay ? 'active' : 'static'}>
      <_CenterOnlyTransitionScene
        ref={activeRef}
        $overlay={activeOverlay}
        data-overlay={activeOverlay ? 'enter' : undefined}
        style={{ zIndex: activeOverlay ? 3 : 1 }}
        data-allow-motion={phase === 'overlay' ? '' : undefined}
      >
        {active.node}
      </_CenterOnlyTransitionScene>
    </OverlayRoleContext.Provider>

    {exitOverlay ? (
      <OverlayRoleContext.Provider value="exit">
        <_CenterOnlyTransitionScene
          ref={exitRef}
          $overlay
          data-overlay="exit"
          style={{ zIndex: 2 }}
          data-allow-motion={phase === 'overlay' ? '' : undefined}
        >
          {exitOverlay}
        </_CenterOnlyTransitionScene>
      </OverlayRoleContext.Provider>
    ) : null}
  </_CenterOnlyTransitionRoot>
);
```
- Logic hook (drives transforms; 3‑frame finalize with watchdog):
```ts
// /src/components/CenterOnlyTransition/logic.ts (abridged)
const enterTarget = getAnimatedTarget(activeNode); // prefers [data-center-content]
const exitTarget  = getAnimatedTarget(exitNode);
const eff = reduceMotion ? 0 : duration;
if (eff <= 0) { setActiveOverlay(false); setExitOverlay(null); unlock(); setPhase('settled'); return; }

// Seed transforms without transition
exitTarget.style.transition = 'none'; exitTarget.style.transform = 'translate3d(0,0,0)';
enterTarget.style.transition = 'none'; enterTarget.style.transform = `translate3d(${inX}%,0,0)`;
// Reflow, then apply final transforms with transition (animation starts on first paint)
exitTarget.style.transition = `transform var(--transition-duration) var(--transition-easing)`;
exitTarget.style.transform  = `translate3d(${outX}%,0,0)`;
enterTarget.style.transition= `transform var(--transition-duration) var(--transition-easing)`;
enterTarget.style.transform = 'translate3d(0,0,0)';

// Finalize sequence
// T+1: remove exit overlay
// T+2: demote active to static and freeze transitions on scene root and enter target
// T+3: unlock height/minHeight and cleanup inline hints

// Fallback and watchdog ensure finalize runs even if 'transitionend' is missed
setTimeout(finalize, eff + 50);
setTimeout(watchdog, eff + 200);
```
- Styles:
```tsx
// /src/components/CenterOnlyTransition/styles.tsx
export const _CenterOnlyTransitionRoot = styled.div`
  position: relative; width: 100%; height: auto; min-height: 1px; overflow: visible;
  contain: none; isolation: isolate;
  &[data-center-phase='overlay'] { overflow: hidden; contain: layout paint; }
`;

export const _CenterOnlyTransitionScene = styled.div<{ $overlay?: boolean }>`
  position: ${({ $overlay }) => ($overlay ? 'absolute' : 'static')}; inset: 0; width: 100%; height: ${({ $overlay }) => ($overlay ? '100%' : 'auto')};
  /* Overlay should absorb events while sliding to block interactions with underlay */
  pointer-events: ${({ $overlay }) => ($overlay ? 'auto' : 'auto')};
  /* Keep scene wrappers transform-free. Motion belongs to [data-center-content]. */
  &[data-allow-motion] [data-center-content] { will-change: transform; }
`;
```
- Motion config: Inline `transition` & `transform` on animated targets; local `--transition-duration`/`--transition-easing` are set for clamp compatibility.
- Accessibility: Short‑circuit when `prefersReducedMotion()` is true (no transforms; instant settle).

#### useFlowCenterDirection (direction latch)
- Path: `/src/components/CenterOnlyTransition/useFlowCenterDirection.ts`
- Purpose: Resolve and latch `direction` per `location.key` using one‑shot intent (`NavigationContext.nextTransitionRef`) or `window.history.state.idx` fallback.

#### FlowLayout (center marker & shell chrome publishing)
- Path: `/src/containers/Layouts/FlowLayout/index.tsx`
- Role: Marks center content wrapper with `data-center-content data-allow-motion`; publishes header/footer to the persistent shell (`MainLayout`) via `LayoutChromeContext`. Publishing is gated by `OverlayRoleContext` so exit overlays never clear shell chrome on unmount.
- Header/footer transitions: Published nodes are wrapped with `data-allow-fade` and local timing vars `--transition-duration: 200ms; --transition-easing: ease`.
- Scroll ownership: Flow pages always scroll through FlowLayout's inner viewport (kept free of transforms). While FlowLayout is mounted, it points `NavigationContext.scrollRef` to that viewport for accurate height-locking and scroll restoration. The animated target remains the outer `[data-center-content]` wrapper.

#### Motion ownership contract (flow pages)
- Scroll owner: `FlowLayout` viewport (`[data-app-scroller='flow']`).
- `NavigationContext.scrollRef`: points to the flow viewport while `FlowLayout` is mounted, then restores to the previous owner on unmount.
- Route transform owner: only `[data-center-content]` (inside active/exit scenes).
- Guardrail: the flow scroll viewport and scene wrappers must remain transform-free.

#### MainLayout & BaseLayout (persistent shell & scroller)
- Paths: `/src/containers/Layouts/MainLayout/index.tsx`, `/src/containers/Layouts/common/BaseLayout/index.tsx`, `/src/containers/Layouts/common/BaseLayout/styles.ts`
- Role: Render persistent header/footer and the center slot; manage baseline scroll container registration. `BaseLayout` registers the shell scroller, and `FlowLayout` overrides `NavigationContext.scrollRef` while mounted on flow pages. Bars are stabilized using compositing hints and `scrollbar-gutter: stable`.

#### CenterTransitionShell (flow shell)
- Path: `/src/containers/Layouts/Shells/CenterTransitionShell.tsx`
- Role: Hosts `LayoutChromeContext` state and `MainLayout`. Renders `CenterAnimatedOutlet` to animate center content only while keeping header/footer persistent.

#### FromBelowReveal (element‑level reveal)
#### LayoutPositionAnimator (FLIP container)
- Path: `/src/components/Animations/LayoutPositionAnimator/index.tsx`
- Purpose: Wraps a container and animates positional changes of selected descendants using `useFlipLayout`. Transform‑only, clamp‑compliant.
- Key props:
    - `selector=':scope > *'` to pick items; can point to item roots or an inner `[data-flip-target]`.
    - `durationMs`, `easing` → set via local `--transition-*` variables for clamp compatibility.
    - `lockAxis?: 'x' | 'y'` to constrain motion (recommended: `'y'` for vertical slides).
    - `composeTransforms?: boolean` (default **false**) to opt‑in to composing with existing transforms.
    - `deps?: React.DependencyList` to control when FLIP re‑measures (defaults to children & knobs).
- Structure:
```tsx
<_LayoutPositionAnimatorRoot data-allow-motion style={{ ['--transition-duration' as any]: '250ms' }}>
  {/* children; each may contain an optional [data-flip-target] */}
</_LayoutPositionAnimatorRoot>
```

#### useFlipLayout (FLIP hook)
- Path: `/src/hooks/useFlipLayout.ts`
- Purpose: Implements FLIP with DOM reads/writes batched for performance. Measures previous rects on cleanup, current rects on the next effect, seeds inverted `translate3d(dx,dy,0)` without transition, forces a single reflow, then transitions back to identity.
- Behavior & guardrails:
    - **Clamp‑safe**: uses `data-allow-motion` + local `--transition-*` vars.
    - **Reduced motion**: skips transforms when `prefersReducedMotion()` is active (`getAccessibleDuration() <= 0` short‑circuits).
    - **Exit overlay**: short‑circuits when `OverlayRoleContext === 'exit'`.
    - **Axis lock**: `lockAxis` zeroes `dx` or `dy` to avoid diagonal paths.
    - **Transform composition**: opt‑in via `composeTransforms`; default **false** to avoid `getComputedStyle` cost.
    - **Caching**: WeakMap host→target cache avoids repeated `[data-flip-target]` queries.
    - **Batched writes**: one reflow (`container.getBoundingClientRect()`) after seeding.
    - **Cleanup**: restores prior inline `transform`/`transition`, removes temporary vars/attributes, uses `AbortController` + watchdog to finalize even if `transitionend` is missed.
- Pseudocode (abridged):
```ts
const hosts = selector === ':scope > *' ? Array.from(container.children) : qsa(selector);
const curr = mapRect(hosts.map(h => [h, target(h).getBoundingClientRect()]));
if (prev && shouldAnimate) {
  const entries = diff(prev, curr, lockAxis); // compute dx,dy
  if (entries.length && getAccessibleDuration(durationMs) > 0) {
    seed(entries);              // transition:none; transform: translate3d(dx,dy,0)
    container.getBoundingClientRect();
    play(entries);              // transition: transform var(--duration) var(--easing); transform: identity
    finalizeOnEndOrTimeout();   // restore inline styles; drop data-allow-motion if added
  }
}
prevRectsRef.current = curr;
```

#### CenterToTopEntrance (center → top hero entrance)
- Path: `/src/components/Animations/CenterToTopEntrance/index.tsx`
- Purpose: One‑shot entrance that renders a hero centered in a temporary overlay, then FLIPs it to the top of the page. The static hero is present in normal flow from first paint (hidden), so surrounding layout is correct and siblings don’t jump.
- Lifecycle & phases: `'center' → 'shifting' → 'done'`.
    - Holds centered for `settleDelay` ms, then animates up over `durationMs`/`easing` using `LayoutPositionAnimator` with `lockAxis='y'`.
    - On finalize: shows the static hero (`visibility: visible`) and removes the overlay.
    - **Exit overlay**: short‑circuits; renders static child only (no timers/animation).
- Key props:
    - `overlayContent?`: optional alternate node for the temporary overlay to avoid child side‑effects.
    - `settleDelay=1200`, `durationMs=400`, `easing='ease-in-out'`.
    - `viewportEl?`: optional viewport/scroller to size the centering stage; otherwise uses `window.innerHeight`.
    - `onDone?`: fires exactly once when settled; use this to gate sibling reveals (`<FromBelowReveal in={ready} />`).
    - `skipHold?`: start already settled (reduced motion or special cases).
- Structure:
```tsx
<_CenterToTopEntranceRoot style={{ minHeight: showOverlay ? viewportH : undefined }}>
  <_CenterToTopEntranceStatic $visible={isExit || phase==='done'} $interactive={!showOverlay}>
    {children}
  </_CenterToTopEntranceStatic>
  {showOverlay && (
    <_CenterToTopEntranceOverlay>
      <LayoutPositionAnimator selector=":scope > [data-item] > [data-flip-target]" lockAxis="y" durationMs={durationMs} easing={easing} deps={[phase]}>
        <div data-item>
          <div data-flip-target data-allow-motion>
            <FromBelowReveal delayMs={200}>{overlay}</FromBelowReveal>
          </div>
        </div>
      </LayoutPositionAnimator>
    </_CenterToTopEntranceOverlay>
  )}
</_CenterToTopEntranceRoot>
```
- Notes: SSR‑safe isomorphic layout effect for measuring; blocks pointer events on the static child while overlay is active.
- Paths: `/src/components/Animations/FromBelowReveal/index.tsx`, `/styles.ts`
- Props: `in=true`, `delayMs`, `durationMs`, `yOffset=16`, `easing`, `className`, `style`, `as`.
- Behavior updates:
    - Reveal arms on mount/when `in` becomes true. If reduced motion is active, it snaps visible without transforms.
    - If rendered in the exit overlay (`OverlayRoleContext === 'exit'`), it becomes active immediately and forces `--reveal-delay: 0ms` to avoid any delayed animation.
    - The previous inline disarm on `transitionend` is no longer used; we rely on the global clamp and overlay lifecycle to prevent late replays.
- Implementation (selected):
```tsx
// /src/components/Animations/FromBelowReveal/index.tsx
const overlayRole = useContext(OverlayRoleContext); // 'active' | 'static' | 'exit'
const isExit = overlayRole === 'exit';
useLayoutEffect(() => {
  if (isExit) { setActive(true); return; }
  let raf = 0;
  if (!isIn) { setActive(false); return; }
  if (reduced) { setActive(true); return; }
  raf = requestAnimationFrame(() => setActive(true));
  return () => raf && cancelAnimationFrame(raf);
}, [isIn, reduced, isExit]);

// Force zero delay on exit overlay
const mergedStyle = isExit ? { ...(style || {}), ['--reveal-delay' as any]: '0ms' } : style;

<_FromBelowRevealRoot
  style={mergedStyle}
  $duration={durationMs}
  $delay={delayMs}
  $offset={yOffset}
  $easing={easing}
  $reduced={reduced}
  $active={active && isIn}
  data-allow-motion
  data-reveal
>
  {children}
</_FromBelowRevealRoot>
```
- Styles (selected):
```tsx
// /src/components/Animations/FromBelowReveal/styles.ts
export const _FromBelowRevealRoot = styled.div<{
  $duration: number;
  $delay: number;
  $offset: number;
  $easing: string;
  $reduced: boolean;
  $active: boolean;
  $freeze?: boolean;
}>`
  will-change: transform, opacity;
  backface-visibility: hidden;

  opacity: ${({ $active }) => ($active ? 1 : 0)};
  transform: ${({ $reduced, $active, $offset }) =>
    $reduced ? 'none' : `translate3d(0, ${$active ? 0 : $offset}px, 0)`};

  --transition-duration: ${({ $duration }) => getAccessibleDuration($duration)}ms;
  --transition-easing: ${({ $easing }) => $easing};

  transition-property: transform, opacity;
  transition-duration: var(--transition-duration);
  transition-delay: var(--reveal-delay, ${({ $delay }) => $delay}ms);
  transition-timing-function: var(--transition-easing);

  ${({ $freeze }) =>
    $freeze &&
    css`
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
      will-change: auto;
    `}
`;
```
- Accessibility: Respects reduced motion.

#### Progress (width animation)
- Path: `/src/components/Progress/styles.tsx`
- Implementation:
```tsx
export const _ProgressValue = styled.div.attrs({ 'data-allow-width': true })<{ $value:number }>`
  will-change: width; backface-visibility: hidden;
  --transition-duration: ${getAccessibleDuration(DURATION_MS)}ms; --transition-easing: ease-in-out;
  transition: width var(--transition-duration) var(--transition-easing);
  @media (prefers-reduced-motion: reduce) { transition: none; }
  width: ${({ $value }) => $value}%;
`;
```
- Lives in persistent header via `LayoutProgress` and `MainLayout`; never remounts during center transitions.

### No-remount invariants
To ensure single‑play animations, the following invariants must hold.

- Stable mounts (must not remount across a navigation step):
    - App shell: `.app-root`, `NavigationProvider`, `ProgressBarProvider` (`/src/containers/App.tsx`).
    - Router shells: `AnimatedOutlet` (root), `CenterTransitionShell` (for `/flow/*`) (`/src/containers/AppRouter.tsx`).
    - Layout: `MainLayout`, `BaseLayout` regions (`_BaseLayoutRoot/Main/Header/Content/Footer`).
    - Flow center transition: `_CenterOnlyTransitionRoot` and `Scene(active)` (`/src/components/CenterOnlyTransition/...`).
    - Page center content wrapper: `LayoutTransitionContainer` with `data-center-content` inside `FlowLayout`.
- Allowed to mount/unmount:
    - `Scene(exit)` overlay (leaving page) during flow transitions.
    - In non‑flow `AnimatedOutlet`, enter/exit wrappers per route (by design); for flow paths the wrapper key is stabilized to `'__flow__'`.
- Single‑mount per route step checklist:
    - Keys: In `AnimatedOutlet`, use `transitionKey = '__flow__'` for flow routes; avoid `key={location.key}` on containers inside `Scene(active)`.
    - Overlay lifecycle: Only create/remove `exitOverlay`; never recreate `active` after animation begins.
    - Effects: `CenterOnlyTransition` must not call `setActive({...})` again at finalize; only toggles `$overlay` and removes `exitOverlay`.
    - Chrome publishing: In `FlowLayout`, publish header/footer only when `OverlayRoleContext !== 'exit'`.
    - Avoid phase‑dependent keys or timestamp keys on page subtrees.

### Call Graphs and Lifecycles

#### Non‑flow route transitions
```
AppRouter → AnimatedOutlet → Stage → TransitionGroup
                                └─ CSSTransition(key) → Wrapper (data-allow-motion)
                                           └─ route element
Mount: Stage persistent; Wrapper remounts per route (non-flow).
Trigger: CSS class changes from CSSTransition. Variant: fade-only.
Props active: --route-transition-duration; data-allow-motion.
```

#### Flow center transitions
```
AppRouter → CenterTransitionShell → MainLayout (persistent header/footer)
                                   └─ CenterAnimatedOutlet
                                      └─ CenterOnlyTransition
                                         ├─ _CenterOnlyTransitionRoot (persistent; height lock during transition)
                                         ├─ Scene(active)  [$overlay true→false; single-mount]
                                         │    └─ route element (FlowLayout → [data-center-content])
                                         └─ Scene(exit)    [$overlay=true; temporary]
Mount: single for entering; exit overlay only temporary.
Trigger: JS transforms on targets; timing via --transition-duration/--transition-easing.
Opt-ins: data-allow-motion on scenes only during overlay phase; center content wrapper carries data-allow-motion.
```

#### Page reveal lifecycle
```
FlowLayout → LayoutTransitionContainer [data-center-content data-allow-motion]
           └─ FromBelowReveal(delayMs) → child
Mount: Wrapper mounts once; plays once when in=true; if in exit overlay, is visible immediately with zero delay.
Trigger: CSS transform+opacity from component timing vars.
Opt-ins: data-allow-motion on Wrapper; data-reveal marker.
```

### Style Layer

#### Global motion clamp
```ts
// /src/styles/global.ts
export const GlobalStyle = createGlobalStyle`
    .app-root * {
      --transition-props: color, background-color, border-color, box-shadow;
      --transition-duration: 200ms; --transition-easing: ease;
      transition-property: var(--transition-props) !important;
      transition-duration: var(--transition-duration);
      transition-timing-function: var(--transition-easing);
    }
    .app-root [data-allow-motion] { --transition-props: transform, opacity; }
    .app-root [data-allow-size]   { --transition-props: width, height, max-height, flex-basis; }
    .app-root [data-allow-width]  { --transition-props: width; }
    .app-root [data-allow-fade]   { --transition-props: opacity; }
`;
```
Load order: `GlobalStyle` must be injected after all third‑party CSS; ensure styled‑components injection order wins.

Example (combine opt‑in with local timing variables):
```tsx
<div
  data-allow-motion
  style={{ ['--transition-duration' as any]: '300ms', ['--transition-easing' as any]: 'ease-in-out' }}
>
  ...
</div>
```

#### Route transition CSS (non‑flow)
- `Stage` clips and isolates.
- `Wrapper` provides per‑transition `transform/opacity` blocks (`ltr`, `rtl`, `fade`) and a reduced‑motion variant. Runtime policy selects fade‑only for non‑flow routes.

#### Layout compositing & scroller
- `MainLayout`/`BaseLayout` header/footer use `transform: translateZ(0)` and `will-change` to stay on stable GPU layers.
- The content scroller is registered via `NavigationContext.scrollRef`. `CenterOnlyTransition` uses this to height‑lock the stage to the viewport height while sliding.
- Content scroller uses `scrollbar-gutter: stable` to avoid layout jumps.

#### data-allow-* attributes
| Attribute            | Enables transitions for                        | Used in                                                |
|----------------------|--------------------------------------------------|--------------------------------------------------------|
| `data-allow-motion`  | `transform, opacity`                             | Route wrappers, flow scenes (overlay phase), center content, `FromBelowReveal` |
| `data-allow-size`    | `width, height, max-height, flex-basis`          | Expand/collapse containers                             |
| `data-allow-width`   | `width`                                          | Progress bar fill (`_ProgressValue`)                   |
| `data-allow-fade`    | `opacity`                                        | Subtle fades (header/footer content swaps)             |

#### Route fade isolation note
- Fades and slides for non‑flow routes are applied to the `Wrapper` inside `AnimatedOutlet`. The `Stage` acts as an isolated sibling overlay; the main scroll container (`_BaseLayoutContent`) is not the animation owner, preventing inherited or re‑armed transitions.

#### Progress shell confirmation
- `Progress` is rendered in the persistent header via `LayoutProgress` and `MainLayout`. It does not remount during center transitions.
- ARIA: `role="progressbar"`, `aria-valuenow/min/max` provided by `_ProgressRoot`.

#### Clamp load order & specificity
- `GlobalStyle` loads after third‑party CSS so the clamp wins specificity.
- The clamp uses `!important` on `transition-property` to override rogue `transition: all`. Animated elements must opt in via `data-allow-*` and set local `--transition-duration`/`--transition-easing` as needed. If a library injects inline `transition: all`, re‑assert component timing via local CSS variables and ensure proper opt‑in.

#### Guardrails (lint, ESLint, Tailwind, CI)
- Stylelint: ban `transition: all`; enforce property‑specific transitions
```json
{
  "rules": {
    "property-disallowed-list": [["transition"], {"severity": "error", "message": "Use property-specific transitions; global clamp controls timing"}],
    "declaration-property-value-disallowed-list": {
      "transition": ["/^all(\\s|$)/"],
      "transition-property": ["/^all(\\s|$)/"]
    }
  }
}
```
- ESLint / className utilities: forbid `transition-all` and inline `style.transition`
```json
{
  "rules": {
    "no-restricted-syntax": ["error", {"selector": "JSXAttribute[name.name=className][value.value=/\\btransition-all\\b/]", "message": "Do not use transition-all; rely on data-allow-* and component timing"}],
    "no-restricted-properties": ["error", {"object": "style", "property": "transition", "message": "Set --transition-* vars and use data-allow-*; avoid inline transition"}]
  }
}
```
- Tailwind (if used; N/A if Tailwind is not used): disable transition utilities
```js
// tailwind.config.js
module.exports = {
  corePlugins: {
    transitionProperty: false,
    transitionDelay: false,
    transitionDuration: false,
    transitionTimingFunction: false,
  },
};
```
- CI guard:
```bash
git grep -nE "transition:\s*all\b" -- '*.css' '*.scss' '*.ts' '*.tsx' && echo "Found forbidden transition: all" && exit 1
```

### Usage Map
- `AnimatedOutlet`: mounted at root router (`/src/containers/AppRouter.tsx` → `element: <AnimatedOutlet />`).
    - Non‑flow routes are its children; flow routes live under `CenterTransitionShell`. Runtime policy for non‑flow: fade‑only.
- `CenterAnimatedOutlet` → `CenterOnlyTransition`: used within `CenterTransitionShell` to animate center content only.
- `FlowLayout`: marks center content (`data-center-content`) and publishes header/footer into shell (role‑gated).
- `FromBelowReveal`: used in multiple flow pages.
- `Progress`: rendered by `LayoutProgress` in the shell header; width animates via `_ProgressValue`.

### Initialization & Global Concerns
- App providers & clamp scope:
```tsx
// /src/containers/App.tsx
<ThemeProvider theme={base}>
  <GlobalStyle />
  <FontStyles />
  <div className="app-root">
    <NavigationProvider>
      <ProgressBarProvider>
        <AppRouter />
      </ProgressBarProvider>
    </NavigationProvider>
  </div>
</ThemeProvider>
```
- `NavigationContext` exposes:
    - `nextTransitionRef` (one‑shot intent consumed by `useFlowCenterDirection`).
    - `transition` (top‑level transition state for non‑flow CSS fades, also used for scroll timing in `BaseLayout`).
    - `setNextTransitionIntent(null)` is called after key latch in `CenterAnimatedOutlet`.
    - `scrollRef` registered by `BaseLayout` to the real scroller; used by `CenterOnlyTransition` to height‑lock.
- Timing tokens & reduced motion:
    - `TRANSITIONS.duration/easing/delay` come from `/src/utils/transitions/config.ts`.
    - `getAccessibleDuration()` clamps durations when reduced motion is active.
- Performance budget: Avoid stacking `will-change` on long‑lived nodes. Components that set it clear or relax it after transition finalize (handled in `CenterOnlyTransition` finalize; `FromBelowReveal` keeps minimal hints only during active play via CSS rules).

#### Reduced‑motion behaviors per component
| Component                | Behavior when reduced motion                  | Mechanism                                  | Duration clamp |
|--------------------------|-----------------------------------------------|--------------------------------------------|----------------|
| AnimatedOutlet           | Fade only; transform motion removed           | `.transition-status--reduced-motion` style | `getAccessibleDuration()` ≤ 100 ms |
| CenterOnlyTransition     | Skips transforms; instant settle              | JS short‑circuit (`effDuration <= 0`)      | `getAccessibleDuration()` ≤ 100 ms |
| FromBelowReveal          | Visible, no transform; may still fade quickly | `prefersReducedMotion()` branch            | `getAccessibleDuration()` ≤ 100 ms |
| LayoutPositionAnimator   | Skips FLIP; items snap to new layout          | `prefersReducedMotion()` + duration clamp  | `getAccessibleDuration()` ≤ 100 ms |
| CenterToTopEntrance      | Starts settled; no overlay; fires `onDone`    | isomorphic effect + reduced‑motion guard   | `getAccessibleDuration()` ≤ 100 ms |
| Progress                 | Static width updates                          | `@media (prefers-reduced-motion: reduce)`  | N/A (no transition) |

#### Debug helpers
- Log transition events for a node:
```js
const logAll = (label, el) => {
  ['transitionrun','transitionstart','transitionend'].forEach(t =>
    el.addEventListener(t, e => console.log(label, t, e.propertyName, e.elapsedTime))
  );
};
```
- Observe ancestor mutations (classes/styles):
```js
const mo = new MutationObserver(muts => muts.forEach(m => console.log('mut', m.type, m)));
mo.observe(document.querySelector('.app-root'), { attributes: true, attributeFilter: ['class','style'], subtree: true });
// mo.disconnect();
```
- Inspect computed transition property:
```js
const el = document.querySelector('[data-allow-motion]');
getComputedStyle(el).transitionProperty; // expect 'transform, opacity' (or 'width')
```

#### Optional: Navigation epoch guard
- Potential enhancement: Add `navEpoch` to `NavigationContext` that increments on each `location.key` change. `FromBelowReveal` can cache `lastPlayedEpoch` and skip re‑arming if it already played in the current epoch. This avoids duplicate reveals in rare dev/HMR scenarios while keeping default behavior unchanged.

### Acceptance checklist
- Non‑flow `AnimatedOutlet`
    - [ ] Exactly one enter/exit per navigation; `Stage` persists.
    - [ ] In flow paths, `transitionKey === '__flow__'` (no top‑level fades inside flow). Clear `NavigationContext.transition` via timeout in flows.
    - [ ] Reduced motion removes transforms.
    - DevTools: [ ] One `transitionend` for `opacity` per nav (fade variant).
- Flow `CenterOnlyTransition`
    - [ ] Entering page is single‑mount inside `Scene(active)`; only `Scene(exit)` is temporary.
    - [ ] Three‑frame finalize: rAF T+1 remove exit; rAF T+2 promote enter → static and freeze transitions; rAF T+3 unlock height/minHeight and cleanup.
    - [ ] Animated targets show `transition-property: transform` and local `--transition-*` vars during overlay.
    - [ ] Root exposes `data-center-phase` → `'settled'` after finalize.
    - DevTools Subtree breakpoints: [ ] Only exit overlay node removed per navigation.
- FromBelowReveal
    - [ ] Arms once on mount/when `in` becomes true; in exit overlays, reveals are active immediately and honor `--reveal-delay: 0ms`.
    - [ ] No late replay when route finalizes in common cases; verify via transition events around finalize timestamp.
- Progress
    - [ ] `_ProgressValue` has `data-allow-width`, `will-change: width`, local `--transition-*`; width transition animates smoothly.
    - [ ] Progress lives in persistent header; not remounted during center transitions.
- Layout & global
    - [ ] `_BaseLayoutFooter` is always fixed when configured; `_BaseLayoutMain` has `scrollbar-gutter: stable`.
    - [ ] No ancestor overflow/position/display flips at finalize re‑arm transitions on descendants.
    - [ ] Clamp is active (`.app-root *`); animated nodes carry correct `data-allow-*`.
- LayoutPositionAnimator / useFlipLayout
    - [ ] Transform‑only (`transitionProperty: transform` on animated targets under clamp).
    - [ ] One forced reflow after seeding; no diagonal drift when `lockAxis='y'`.
    - [ ] Restores inline `transform`/`transition` and removes temporary attributes after finalize.
- CenterToTopEntrance
    - [ ] Overlay only during entrance; static hero visible after `'done'`.
    - [ ] Short‑circuits in exit overlay (no timers/animation).
    - [ ] `onDone` fired exactly once; sibling reveals can gate on it.
- Cross‑engine validation
    - [ ] Validate in Chromium, Firefox, and Safari (production build) to ensure cross‑engine transition consistency.

Sample DevTools steps:
- Add transition event listeners to a reveal node; confirm expected `transitionend(property='transform')` count and that exit overlay reveals show no delayed run.
- In Elements → Breakpoints → Subtree modifications on `_CenterOnlyTransitionRoot`; confirm a single node removal (exit overlay) per nav.
- Inspect computed styles on animated nodes for `transitionProperty`, `--transition-duration`, `--transition-easing` before/after play.

### Enforcement & audit quickstart
- Code review checks
    - Animated elements must opt in via `data-allow-*` and set local `--transition-*` timing.
    - No unstable `key` props in flow page subtrees; only the exit overlay is transient.
    - `FlowLayout` must publish header/footer only when `OverlayRoleContext !== 'exit'`.
    - Global clamp present and loaded after third‑party CSS.
- Tooling
    - Stylelint rule banning `transition: all`.
    - ESLint rules forbidding `transition-all` utilities and inline `style.transition`.
    - Tailwind config (if used) to disable transition utilities.
    - CI `git grep` to block `transition: all` in CSS/TSX.
- Run the Acceptance checklist before release across Chromium/Firefox/Safari in both dev and prod builds.
