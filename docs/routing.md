# Routing

React Router 7 (data routers, hash URLs) with **route groups chosen by
session state**. See ADR [0002](decisions/0002-routing-model.md).

## Route groups

`src/containers/AppRouter.tsx` mounts exactly one router at a time:

| Group        | When                                       | Routes defined in                |
| ------------ | ------------------------------------------ | -------------------------------- |
| `guest`      | not signed in                              | `src/views/guest/index.tsx`      |
| `onboarding` | signed in, `user.needsOnboarding === true` | `src/views/onboarding/index.tsx` |
| `user`       | signed in and onboarded                    | `src/views/user/index.tsx`       |

The group is **derived during render** from auth state (`deriveRouterType`);
nothing calls "switch router" imperatively. Nothing is routed until the
session is known: while it is restored the app shows `AppLoading`, and if
the check fails, `SessionUnavailable` with a retry (a retry keeps the current
router instead of swapping groups). When the session changes (sign in, sign
out, onboarding completed, session expired), the next group's router starts
at the path where the previous one ended, so destinations survive the swap.
`src/containers/routing/routeTable.ts` assembles the groups (plus demo routes
in demo builds); the swap rules are a pure function,
`src/containers/routing/routerSession.ts`.

**Destinations behind required onboarding.** When signing in (or restoring
a session) leads to the onboarding group, the user's destination — a safe
`returnTo` for a user route, or the protected path that was opened — is kept
aside; onboarding starts at its first step, and completing it opens that
destination, query included. Unsafe or unknown destinations are dropped
(home instead); signing out discards it. It lives in memory, so a full
reload during onboarding falls back to home afterwards.

Because a group simply does not contain other groups' routes, guests cannot
render user routes at all: route-level protection is structural. It is still
**UX only** — the server must authorize every request.

## Unknown paths and `returnTo`

Any path a group does not define renders `UnknownRoute` with a per-group
policy (`containers/routing/unknownRoutePolicy.ts`):

| Group        | Path belongs to another group                             | Path exists nowhere |
| ------------ | --------------------------------------------------------- | ------------------- |
| `guest`      | → `/sign-in?returnTo=<path+search>`                       | Not Found page      |
| `user`       | `returnTo` honored if it is a user route; otherwise → `/` | Not Found page      |
| `onboarding` | `returnTo` honored if allowed; otherwise → first step     | → first step        |

`returnTo` is validated against the target group's own route patterns
(`globals/navigation/returnTo.ts`): absolute, protocol-relative and
backslash URLs and unknown paths are ignored, so it is not an open redirect.
Example: a guest opens `/#/items?status=archived`, signs in, and lands on
exactly that URL; signing out on a protected page leads to sign-in for that
page.

For a single protected route inside an otherwise public group, wrap it in
`<RequireAuth>` (`src/guards/RequireAuth.tsx`); it waits until the session is
known before deciding.

## Route definitions

```ts
// src/views/user/index.tsx
export const UserRoutes: RouteType[] = [
  { path: paths.dashboard, Component: Dashboard },
  {
    path: paths.reports, // add it to src/globals/paths.ts first
    lazy: () =>
      import('./Reports').then(({ Reports }) => ({ Component: Reports })),
  },
];
```

- Paths live in `src/globals/paths.ts`; never hardcode them in views.
- A route is `Component`, `element` or `lazy`. Use `lazy` for routes that pull
  in heavy code (forms, dialogs); `pnpm check:build` keeps the listed lazy
  routes out of the initial bundle.
- Every route gets `ErrorPage` as its error boundary. For lazy routes the
  boundary comes with the loaded module, so a failed chunk load (typically
  after a deploy) falls back to the parent boundary, which offers **Reload**
  (`views/system/ErrorPage`). A first-render lazy route shows `AppLoading`
  while it loads.
- Paths under `/flow/` render inside the flow shell (slide transitions,
  step order from `paths.flow`). See [flows.md](flows.md).
- In-page state such as filters belongs in the URL search
  (`useSearchParams`), updated with `replace` so filters do not flood
  history. Non-flow pages are keyed by pathname, so search changes never
  remount the page or move focus.

## Hash routing and base paths

`createHashRouter` keeps routing independent of the server: any static host
works, including GitHub Pages sub-paths, with no rewrite rules. Only asset
URLs depend on the base path ([configuration.md](configuration.md#base-path)).
`hashRouterFactory` moves the URL to a group's start path when it differs
(a kept destination). If you move to path-based URLs, configure your host to
serve `index.html` for unknown paths and replace `hashRouterFactory` in
`AppRouter` with a factory that honors `initialPath` the same way — the route
tables do not change.

## Tests

`renderApp` (`src/test/app.tsx`) renders the real shell with a memory router
and an injected auth adapter:

```tsx
renderApp({
  routes,
  initialPath: '/items',
  adapter: createFakeAuthAdapter({ user: testUser }),
});
```

Routing behavior is covered by `src/containers/*.test.tsx`,
`src/containers/routing/*.test.tsx` (including the flow contract and the
router-session rules), `src/guards/RequireAuth.test.tsx` and the Playwright
suite (deep links, refresh, destinations through onboarding,
protected-route denial).
