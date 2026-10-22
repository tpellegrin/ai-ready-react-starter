# Onboarding Flow

The onboarding flow is the **canonical reference implementation** of the flow architecture. Study it before building a new flow.

> For the complete flow architecture documentation, see [`docs/flows.md`](../../../docs/flows.md).

---

## Purpose

Onboarding runs for users who are authenticated but have `needsOnboarding: true` on their user record. It is a guided three-step setup experience; completing it updates the session, and AppRouter then mounts the user routes.

## Route tree

```
/flow/onboarding/welcome      → Welcome screen   (no back button)
/flow/onboarding/preferences  → Preferences screen (back + continue)
/flow/onboarding/complete     → Completion screen  (back + finish)
```

All routes use the `/flow/` prefix → routed through `CenterTransitionShell` → LTR/RTL slide transitions.

## File structure

```
src/views/onboarding/
  Welcome/
    index.tsx        ← Welcome screen
  Preferences/
    index.tsx        ← Preferences screen
  Complete/
    index.tsx        ← Completion screen (rendering)
    logic.ts         ← completeOnboarding() with pending and error states
  index.tsx          ← Route definitions (OnboardingRoutes)
  README.md          ← This file
```

## Key patterns demonstrated

- **`FlowLayout`** — all three screens compose this layout
- **`useFlowNav`** — provides `goNext()` and `goBack()`
- **`useFlowProgressFromPaths`** — provides `percentage` for the header progress bar
- **`FlowLayoutHeader`** — rendered via the `header` prop on `FlowLayout`
- **`LayoutFooter`** — wraps the Continue/Finish button
- **i18n** — all copy uses `useI18n()` with keys under `onboarding.*`
- **Accessible heading** — every screen has a `<Text as="h1">` element
- **Flow exit** — `Complete` calls `completeOnboarding()` (via `useAuth`, in `logic.ts`); the user's `needsOnboarding` becomes false and AppRouter mounts the user routes at the destination kept since sign-in, if any. A failure stays on the step with the reason, and the button retries.

## How to trigger onboarding in development

Sign in with an email you have not used before: both the demo adapter
(demo builds) and the mock session backend (`src/mocks/session.ts`) mark the
first sign-in per email as `needsOnboarding: true`, so the app routes to
`/flow/onboarding/welcome`. Finishing the flow is remembered for that email.

## i18n keys

```
onboarding.welcome.heading
onboarding.welcome.title
onboarding.welcome.body
onboarding.preferences.heading
onboarding.preferences.title
onboarding.preferences.body
onboarding.complete.heading
onboarding.complete.title
onboarding.complete.body
onboarding.complete.cta
onboarding.complete.pending
```
