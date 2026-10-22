# Architecture overview

A compact React 19 + Vite + TypeScript SPA foundation: neutral
infrastructure, generators that produce its patterns, and guardrails that
fail when the architecture is violated ([guardrails](guardrails.md)).

## Principles

- **Extend, don't replace.** Routing, auth, data, styling, animation and
  i18n are stable systems with documented extension points.
- **Compose public building blocks.** Pages compose layouts, shared
  components and features through their public APIs; internals stay private
  ([ui/foundation](ui/foundation.md#public-components-and-internals)).
- **Parse at boundaries.** Configuration, API responses, URL input, storage
  and form input go through Zod schemas.
- **Enforced structure.** Layers, features and components have an import
  matrix checked by lint ([boundaries](architecture/boundaries.md)).
- **Accessible by default.** Building blocks encode labels, focus and
  announcements; axe runs in story and e2e tests.

## Startup and app shell

`src/main.tsx` is the composition root: it loads the validated config,
starts the MSW worker only in mock-enabled builds, creates the auth adapter
from `VITE_AUTH_PROVIDER` (`src/containers/composition`) and renders `App`
with its dependencies as props, inside `StrictMode`. Startup failures render
a readable message.

`src/containers/App.tsx` composes providers: QueryClient → Theme (global
styles, fonts) → I18n → Toast → Auth (clears the query cache when the user
changes; `SessionMonitor` connects API 401s to session checks) → Navigation
→ ProgressBar → AppRouter. ADRs
[0001](decisions/0001-app-shell-and-providers.md),
[0010](decisions/0010-configuration-and-composition-root.md).

## Routing

Hash-based data routers, one per session state (guest, onboarding, user),
derived during render once the session is known. Unknown paths follow a
per-group policy with a validated `returnTo`; a destination behind required
onboarding is kept until onboarding completes; lazy routes are code-split
with reload-on-chunk-error. See [routing.md](routing.md) and
[flows.md](flows.md) for multi-step flows.

## Authentication and session

`AuthProvider` owns session state and calls an injected `AuthAdapter`
(`restoreSession`, `signIn`, `signOut`, `completeOnboarding`, each with an
`AbortSignal`) in one queue with deadlines. The reference adapter uses an
HttpOnly cookie session with an optional CSRF token. Views use `useAuth()`
only. Failure policy, deployment (CORS, cookies, CSRF) and adapter
integration: [session-lifecycle.md](session-lifecycle.md); ADR
[0003](decisions/0003-auth-adapter-boundary.md).

## Data

A thin fetch client (`src/api/http`) with base URL, credentials, timeouts,
abort, normalized `ApiError`s and a response schema per request; TanStack
Query for server state with feature-owned keys, bounded retries and cache
isolation per identity. In development, tests and Storybook, MSW serves the
mock API (`src/mocks` and each feature's `mocks/`). See
[recipes/data-and-forms.md](recipes/data-and-forms.md) and ADR
[0011](decisions/0011-http-client-and-server-state.md).

## Features

Product capabilities live in `src/features/<name>` (model, api, queries,
components with colocated `logic.ts`, mocks) behind an `index.ts` public API.
Scaffold one with `pnpm gen feature <name>`
([recipe](recipes/new-feature.md)).

<!-- starter:reference-start -->

`src/features/resources` is the complete reference: list with
loading/empty/error states, URL filter, create/edit dialog with client and
server validation, delete confirmation, toasts and locale-aware formatting.

<!-- starter:reference-end -->

## UI, forms and styling

Domain-neutral building blocks in `src/components` (Radix for dialogs and
toasts), React Hook Form + Zod with `Field` composition, styled-components
with theme tokens (`src/styles/themes`). A component's `index` is its public
API; internal `_<Component><Part>` elements live in `styles.ts`; rendering in
`index.tsx`, meaningful logic in `logic.ts`. Find what exists with
`pnpm catalog`. See [ui/foundation.md](ui/foundation.md).

## Animation

Route fades (`src/containers/RouteTransitions/AnimatedOutlet`), flow slides
(`CenterTransitionShell`), reveal helpers in `src/components/Animations`,
all respecting `prefers-reduced-motion`. See
[animation-system.md](animation-system.md).

## i18n

`src/i18n`: typed keys, `useI18n()` with interpolation, locale-aware number,
currency and date formatting, a generated pseudo-locale, and
`pnpm i18n:check` for key and placeholder parity. All user-facing copy goes
through `t()`.

## Testing and quality

Unit/integration tests with Vitest + Testing Library + MSW (run under the
real HTTP client); components in Chromium and WebKit through Storybook
(interaction + axe); Playwright against built apps on desktop Chromium and
mobile WebKit, plus the dev server under Strict Mode; build-output
inspection; generator and adoption checks in temporary copies.
`pnpm validate` for everyday work, `pnpm verify` for everything CI runs. See
ADR [0015](decisions/0015-testing-strategy.md) and
[guardrails.md](guardrails.md).

## Configuration and deployment

Build-time `VITE_*` variables validated by one schema
([configuration.md](configuration.md)); static output with hash routing works
on any host, including sub-paths. Capacitor is optional
([mobile-capacitor.md](mobile-capacitor.md)).

## Where things go

| Change                     | Location                                                           | Command                                    |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Product capability         | `src/features/<name>`                                              | `pnpm gen feature <name>`                  |
| Page / route               | `src/views/<group>/<Page>` + `src/views/<group>/index.tsx`         | `pnpm gen view <Page> --group user\|guest` |
| Multi-step flow            | `paths.flow` + `src/views/<group>/<Flow>/<Step>`                   | `pnpm gen flow <id> --group … --steps …`   |
| Path constant              | `src/globals/paths.ts`                                             | (the generators add them)                  |
| Reusable neutral component | `src/components/<Name>`                                            | `pnpm catalog`, then `pnpm gen component`  |
| Shared hook                | `src/hooks/<useName>`                                              |                                            |
| HTTP/server-state plumbing | `src/api`                                                          |                                            |
| Auth provider integration  | `src/auth/adapters` + `src/containers/composition`                 |                                            |
| Config variable            | `src/config/schema.ts` (+ `vite-env.d.ts`, `.env.example`)         |                                            |
| Mock API for a feature     | `src/features/<name>/mocks`, registered in `src/mocks/handlers.ts` | (`gen feature` registers it)               |
| Copy                       | `src/i18n/locales/*.json`                                          |                                            |
| Design tokens              | `src/styles/themes`                                                |                                            |
