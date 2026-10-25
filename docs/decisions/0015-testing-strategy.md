# 0015 — Testing strategy

## Status

Accepted (2026-10)

## Decision

| Layer                        | Tool                                          | Proves                                                         |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
| Unit / integration           | Vitest + Testing Library (jsdom) + MSW        | Logic, components, full data path through the real HTTP client |
| Components in a real browser | Storybook + Vitest browser mode (Chromium)    | Interactions, focus, axe (violations fail)                     |
| Built application            | Playwright + axe                              | Routing, deep links, auth journeys, base paths, reduced motion |
| Build output                 | `scripts/check-build.mjs`                     | Budgets, lazy routes, no demo/mock/test code, base path        |
| Scaffolding                  | `gen:check`, `adopt:check` (temporary copies) | Generated/adopted projects pass every gate                     |

- Tests fail on unhandled requests (unit) and on console/page errors (e2e).
- Defect-fixing changes add a test that fails without the fix.
- Fault injection (`src/mocks/faults.ts`) drives error states without
  test-only code paths in the app.

## Why

jsdom cannot verify real focus, routing over hash URLs, service workers under
a sub-path or reduced motion; e2e alone is too slow to cover component
states. Each layer covers what the previous cannot.

## Consequences

CI needs Chromium for Storybook and e2e jobs (cached per Playwright version).

## Change guidance

Put a test at the lowest layer that can prove the behavior. Keep e2e focused
on journeys and deployment properties.

## Amendment (2026-10): browsers and Strict Mode

- Storybook tests run in Chromium and WebKit; production e2e specs run in
  desktop Chromium and mobile WebKit (iPhone viewport); a `dev` project runs
  the Vite dev server, where Strict Mode replays effects. Why: a flow
  transition defect only appeared under Strict Mode, and mobile WebKit
  exposed focus loss, reduced-motion leaks and an overlapping header that
  desktop Chromium did not.
- Generic accessibility and reduced-motion e2e checks live with the
  production target, so they survive adoption.
- Tooling (scripts) has its own Vitest project with fixture tests.

## Amendment (2026-10): sub-path deployment survives adoption

- The production build is also served under a sub-path (`/app/`, project
  `production-subpath`, `e2e/subpath`). Its smoke test opens the start page
  and a lazy route. It fails on a request outside the base, a response of
  400 or more, a broken image (lazy ones are made eager first) or a font
  that does not load. Why: only the demo's sub-path project proved this in
  a browser, so adoption removed the coverage, and `check:build --base`
  reads only `index.html`.
- `demo-subpath` stays for the demo: its mock service worker's scope
  follows the base.
