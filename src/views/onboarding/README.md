# Onboarding Flow

The onboarding flow is the **canonical reference implementation** of the flow architecture. Study it before building a new flow.

> For the complete flow architecture documentation, see [`docs/flows.md`](../../../docs/flows.md).

---

## Purpose

Onboarding runs for users who are authenticated but have `needsOnboarding: true` on their user record. It is a guided three-step setup experience that exits by switching the router to the user context.

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
    index.tsx        ← Completion screen (calls setRouterType to exit)
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
- **Flow exit** — `Complete` calls `setRouterType(RouterType.user)` to leave onboarding

## How to trigger onboarding in development

The mock adapter in `src/auth/mockAdapter.ts` creates a user with `needsOnboarding` undefined (falsy) by default. To test onboarding, temporarily set:

```ts
const MOCK_USER: User = {
  id: '1',
  email: 'demo@example.com',
  name: 'Demo User',
  needsOnboarding: true,   // ← add this line
};
```

Then sign in with any credentials. The app will route to `/flow/onboarding/welcome`.

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
```
