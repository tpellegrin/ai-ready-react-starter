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
