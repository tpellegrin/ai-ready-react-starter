# Flow System

This document is the authoritative reference for the flow architecture. It covers what a flow is, when to use one, how the system works, and how to add a new flow.

> **Related docs:**
> - [`docs/architecture.md`](./architecture.md) — general architectural overview
> - [`docs/animation-system.md`](./animation-system.md) — transition animation details
> - [`docs/how-to-extend.md`](./how-to-extend.md) — step-by-step extension guide
> - [`src/flows/README.md`](../src/flows/README.md) — flows folder reference
> - [`src/views/onboarding/README.md`](../src/views/onboarding/README.md) — canonical demo

---

## What is a flow?

A **flow** is a guided, stateful, or multi-step experience that needs stronger layout, navigation, transition, or progress conventions than a normal page.

Examples of flows:
- Onboarding / first-run setup
- Multi-step preferences wizard
- Profile completion
- Setup checklist

A normal view (dashboard, settings, detail page) is **not** a flow.

---

## When to use a flow

**Use a flow when:**
- The user progresses through ordered screens
- The experience has back/next semantics
- Progress matters (step indicator, percentage bar)
- Transition continuity matters (LTR slide entering, RTL slide going back)
- Layout constraints differ from normal pages (no persistent nav bar, scroll owned by the flow)
- The route belongs to a temporary guided experience with a defined exit

**Do not use a flow when:**
- The page is a normal dashboard, settings page, or detail view
- There is only one independent page without back/next
- Local component state is sufficient
- A simple inline form or modal handles the interaction
- The flow abstraction would add ceremony without value

---

## Flow architecture

### Route prefix

All flow routes use the `/flow/` URL prefix:

```
/flow/onboarding/welcome
/flow/onboarding/preferences
/flow/onboarding/complete
```

The `AppRouter` (`src/containers/AppRouter.tsx`) automatically routes any path starting with `/flow/` through `CenterTransitionShell` instead of `AnimatedOutlet`. This enables LTR/RTL slide transitions between steps.

### Path registry

Flow step paths and their order live in `src/globals/paths.ts` under the `flow` key:

```ts
export const flowPaths = {
  onboarding: {
    welcome:     '/flow/onboarding/welcome',
    preferences: '/flow/onboarding/preferences',
    complete:    '/flow/onboarding/complete',
  },
} as const;

export const paths = {
  ...guestPaths,
  flow: flowPaths,          // ← consumed by fromPaths.ts helpers
  onboarding: flowPaths.onboarding,  // ← shorthand for views
  ...userPaths,
} as const;
```

**Key ordering matters**: `useFlowNav` and `useFlowProgress` derive step order from the object key order in `paths.flow.<flowId>`. Add steps in the order users should progress through them.

**Note on flow IDs**: The key used in `flowPaths` must match the flow segment in the URL. For example, if your URL is `/flow/my-flow/step1`, the key in `flowPaths` must be `my-flow`. Using camelCase for multi-word flow keys (like `myFlow`) while using kebab-case in the URL (like `my-flow`) will cause runtime errors in the flow navigation helpers. If you need a camelCase alias for JS/TS usage, define it in the `paths` object export.

### Flow helpers (`src/flows/fromPaths.ts`)

Utility functions that read `paths.flow` and operate on the current URL:

| Function | Description |
|---|---|
| `parseFlowFromPath(pathname)` | Extracts `flowId` and `step` from the URL |
| `getOrderedStepKeys(flowId)` | Returns step keys in order |
| `getStepIndex(flowId, step)` | Returns index and total for progress |
| `getNextStepPath(flowId, step)` | Returns the path for the next step |
| `getPrevStepPath(flowId, step)` | Returns the path for the previous step |
| `getNextApplicableStepPath(...)` | Like `getNextStepPath` but skips guarded steps |

These are used internally by `useFlowNav` and `useFlowProgress`. Screen components should consume the hooks, not the helpers directly.

### Navigation hooks

**`useFlowNav`** (`src/hooks/useFlowNav/index.ts`)

Provides `goNext()` and `goBack()` for use inside flow screens:

```ts
const { goNext, goBack } = useFlowNav();

// Advance to the next step (auto-resolved from URL)
goNext();

// Go back to the previous step
goBack();

// Jump to a specific path
goNext('/flow/onboarding/complete');
goBack('/flow/onboarding/welcome');
```

- `goNext` sets `TransitionType.ltr` (content slides in from the right)
- `goBack` sets `TransitionType.rtl` (content slides in from the left)
- Both acquire a nav lock for the transition duration to prevent rapid double-navigation

**`useFlowProgressFromPaths`** (`src/hooks/useFlowProgress/index.ts`)

Returns progress information derived from the current URL:

```ts
const { percentage, index, position, total } = useFlowProgressFromPaths();
// percentage: 0-100 (suitable for <progress> or a visual bar)
// index: zero-based step index
// position: one-based position
// total: total number of steps
```

### Layout

**`FlowLayout`** (`src/containers/Layouts/FlowLayout/index.tsx`)

The single layout component that all flow screens should use. It provides:

- Optional header (with progress bar, back button, close button, title)
- Optional sticky banner
- Scrollable content viewport (scroll ownership — see below)
- Optional footer (fixed or inline)

```tsx
<FlowLayout
  header={{
    title: 'Step title',
    progress: percentage,          // 0-100 or 'auto'
    prevButton: { onClick: goBack },
  }}
  footer={<LayoutFooter><Button label="Continue" onClick={goNext} /></LayoutFooter>}
>
  {/* screen content */}
</FlowLayout>
```

Flow screens should **always** compose `FlowLayout`. Do not create one-off page containers for flow screens — this keeps navigation, transitions, scroll ownership, and spacing consistent across all guided experiences.

**`FlowLayoutHeader`** (`src/containers/Layouts/FlowLayout/FlowLayoutHeader/index.tsx`)

Rendered automatically when you pass a header config object to `FlowLayout`. Composes `LayoutHeader` with optional back button, close button, title, and progress indicator.

**`CenterTransitionShell`** (`src/containers/Layouts/Shells/CenterTransitionShell.tsx`)

The persistent shell wrapping all `/flow/` routes. It renders `MainLayout` once and animates only the center content via `CenterAnimatedOutlet`. Flow screens publish their header and footer into the shell via `LayoutChromeContext` — this prevents header/footer remounts during transitions.

### Scroll ownership

Flow screens always scroll through `FlowLayout`'s inner `ScrollViewport` (`data-app-scroller="flow"`). While a `FlowLayout` is mounted, it registers itself as the owner of `NavigationContext.scrollRef`. When unmounted, it restores the previous owner.

Rules:
- Do not put transforms on the scroll viewport — transforms break momentum scrolling and conflict with animation.
- Do not scroll `body` or the shell scroller from a flow screen.
- Use `scrollLockForMs` on `FlowLayout` to lock scrolling during entrance animations.

### Transitions

Flow transitions use `CenterOnlyTransition` driven by `TransitionType.ltr` / `TransitionType.rtl` from `NavigationContext`. The shell renders both the exiting and entering screen simultaneously during the transition, then removes the exit overlay.

See [`docs/animation-system.md`](./animation-system.md) for full details.

### i18n

All user-facing strings in flow screens must use i18n keys. Add keys under the relevant namespace in all locale files:

```json
// src/i18n/locales/en-US.json
{
  "onboarding": {
    "welcome": { "heading": "Step 1 of 3", "title": "Welcome", "body": "..." }
  }
}
```

Run `pnpm i18n:check` after adding keys to verify all locales are in sync.

### Accessibility

- Flow screens must have a semantic `<h1>` heading on every step
- Back and close buttons must have `aria-label` (provided automatically by `FlowLayoutHeader` via `flow.common.a11y.*` i18n keys)
- Progress indicators should use `role="progressbar"` with `aria-valuenow` (handled by `LayoutProgress`)
- Interactive elements must be keyboard accessible

### Theme tokens

Always use `props.theme` values for colors, spacing, and typography. Never hardcode CSS values. See `src/styles/themes/` for available tokens.

---

## Canonical demo: Onboarding flow

The onboarding flow (`src/views/onboarding/`) is the canonical reference implementation. It demonstrates:

- Three ordered steps: Welcome → Preferences → Complete
- `FlowLayout` with header, progress bar, back/next navigation
- `useFlowNav` for navigation
- `useFlowProgressFromPaths` for the progress indicator
- i18n keys for all copy
- Theme tokens and accessible headings/buttons
- `setRouterType` to exit the flow at completion

**Route tree:**

```
/flow/onboarding/welcome      ← Welcome screen (no back)
/flow/onboarding/preferences  ← Preferences screen (back + next)
/flow/onboarding/complete     ← Completion screen (back + finish)
```

To trigger the onboarding flow in development, set `needsOnboarding: true` on the mock user in `src/auth/mockAdapter.ts`.

---

## Folder structure

```
src/
  flows/
    fromPaths.ts        ← path helpers (getNextStepPath, getPrevStepPath, etc.)
    README.md           ← flows folder reference

  globals/
    paths.ts            ← path registry including flow step definitions

  hooks/
    useFlowNav/         ← goNext / goBack with transition intent
    useFlowProgress/    ← step percentage / index / total from URL

  containers/
    Layouts/
      FlowLayout/       ← the layout all flow screens compose
      Shells/
        CenterTransitionShell.tsx  ← persistent shell for /flow/ routes

  views/
    onboarding/         ← canonical flow demo (Welcome, Preferences, Complete)
```

---

## How to add a new flow

### 1. Decide if you really need a flow

Review the "When to use a flow" section above. If the experience is a single page, a modal, or does not have back/next semantics, a flow is probably overkill.

### 2. Add step paths to `paths.ts`

Add your flow under `flowPaths` in `src/globals/paths.ts`. Step key order determines navigation order.

**Critical**: The key in `flowPaths` MUST match the flow segment in the URL.

```ts
export const flowPaths = {
  onboarding: { ... },          // existing
  'preferences-flow': {         // use a key that matches the URL segment
    theme:    '/flow/preferences-flow/theme',
    language: '/flow/preferences-flow/language',
    done:     '/flow/preferences-flow/done',
  },
} as const;
```

Also add a shorthand under `paths` if convenient:

```ts
export const paths = {
  ...guestPaths,
  flow: flowPaths,
  onboarding: flowPaths.onboarding,
  preferences: flowPaths.preferences,  // ← add shorthand
  ...userPaths,
} as const;
```

### 3. Create screen components

Create a folder under `src/views/<routerType>/<FlowName>/`:

```
src/views/user/Preferences/
  ThemeStep.tsx
  LanguageStep.tsx
  DoneStep.tsx
  index.tsx        ← route exports
```

Each screen composes `FlowLayout`:

```tsx
import { FlowLayout } from 'containers/Layouts/FlowLayout';
import { useFlowNav } from 'hooks/useFlowNav';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';
import { LayoutFooter } from 'containers/Layouts/common/LayoutFooter';
import { Button } from 'components/Button';
import { Text } from 'components/Text';
import { Flex } from 'components/Flex';
import { useI18n } from 'i18n/provider';

export function ThemeStep() {
  const { t } = useI18n();
  const { goNext, goBack } = useFlowNav();
  const { percentage } = useFlowProgressFromPaths();

  return (
    <FlowLayout
      header={{
        title: t('preferences.theme.heading'),
        progress: percentage,
        prevButton: { onClick: () => goBack() },
      }}
      footer={
        <LayoutFooter>
          <Button
            label={t('common.actions.continue')}
            onClick={() => goNext()}
            aria-label={t('common.actions.continue')}
          />
        </LayoutFooter>
      }
    >
      <Flex direction="column" gap="md">
        <Text as="h1" variant="headingLg">{t('preferences.theme.title')}</Text>
        <Text variant="bodyMd">{t('preferences.theme.body')}</Text>
      </Flex>
    </FlowLayout>
  );
}
```

### 4. Register routes

Add routes to the appropriate router type in `src/views/<routerType>/index.tsx`:

```ts
export const UserRoutes: RouteType[] = [
  { path: paths.dashboard,             Component: Dashboard },
  { path: paths.preferences.theme,    Component: ThemeStep },
  { path: paths.preferences.language, Component: LanguageStep },
  { path: paths.preferences.done,     Component: DoneStep },
];
```

Because these paths start with `/flow/`, AppRouter automatically wraps them in `CenterTransitionShell`.

### 5. Add i18n keys

Add keys to all locale files (`src/i18n/locales/*.json`) and run `pnpm i18n:check`.

### 6. Add tests

Write tests for:
- Screen renders the expected heading and buttons
- Next button navigates to the next step
- Back button navigates to the previous step
- Completion step exits the flow correctly

Use existing patterns from `src/views/onboarding/__tests__/`.

### 7. Validate

```sh
pnpm validate
```

---

## Flow screen checklist

Before marking a flow screen complete, verify:

- [ ] Uses `FlowLayout` (not a custom page container)
- [ ] Header passes `progress` from `useFlowProgressFromPaths`
- [ ] Back button is present on all steps except the first
- [ ] All buttons have `aria-label`
- [ ] `<h1>` heading is present on every step
- [ ] All copy uses i18n keys (no hardcoded strings)
- [ ] Completion step exits the flow (router switch, redirect, or mutation)
- [ ] Loading/error state handled if the step has async operations
- [ ] Tests cover next/back behavior and completion
- [ ] `pnpm validate` passes
