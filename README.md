# React SPA starter

A compact, production-oriented foundation for React single-page apps:
React 19, Vite 7, TypeScript (strict), styled-components, React Router 7,
TanStack Query, Zod, React Hook Form and Radix primitives — with generators
that produce its patterns and guardrails that fail when the architecture,
accessibility or bundle drift. Built to be worked on by people and AI
coding agents alike (start with [AGENTS.md](AGENTS.md)).

- **Validated configuration** and an explicit composition root; demo and mock
  code can never reach a real build.
- **Session-state routing** with protected groups, safe `returnTo` deep
  links kept through sign-in and onboarding, and code-split routes.
- **A defined session lifecycle**: serialized, time-bounded auth
  operations, a 401 policy that never logs out on a failed check, sign-out
  that only ends when the server confirms, CSRF token transport.
- **Schema-validated HTTP client** with timeouts + feature-owned server
  state, mocked with MSW in development, tests and Storybook.
- **Enforced structure**: layers, features and component public APIs
  (aliases, relative paths, re-exports and `import()` included), with
  positive/negative fixtures.
- **Accessible UI foundation** (forms, dialogs, toasts, feedback states)
  tested with axe in Chromium and WebKit; flows tested on mobile WebKit and
  under Strict Mode.
- **Generators** for features, components, pages and flows, a component
  **catalog**, and an adoption command verified end to end in CI.

## Quick start

Requirements: Node 24 LTS (`.nvmrc`) and pnpm 9 via Corepack
(`corepack enable`).

```bash
pnpm install
pnpm start          # http://localhost:3000, with the mock API
```

For the Storybook and end-to-end suites, install the browsers once:
`pnpm exec playwright install chromium webkit`.

## Commands

| Command                                                 | Purpose                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm start`                                            | Dev server                                                                |
| `pnpm validate`                                         | Fast gates: format, lint, styles, types, i18n, docs, architecture, tests  |
| `pnpm verify`                                           | Everything CI runs, with concise output and a report in `reports/verify/` |
| `pnpm verify --affected`                                | A conservative subset for your current diff (iteration, not merging)      |
| `pnpm gen feature\|component\|view\|flow …`             | Scaffold code that follows the conventions (`--dry-run` to preview)       |
| `pnpm catalog [name\|prop]`                             | Find existing components, layouts and feature APIs before adding one      |
| `pnpm design init\|check\|capture\|regress …`           | Build pages from screenshots or sketches: plan checks, browser evidence   |
| `pnpm test` / `test:run` / `test:cov`                   | Unit tests (watch / once / with coverage floors)                          |
| `pnpm storybook` / `test:storybook` / `storybook:build` | Component catalog, browser tests, static build                            |
| `pnpm test:e2e`                                         | Playwright against built apps and the dev server                          |
| `pnpm build` + `pnpm check:build`                       | Production build (needs `VITE_API_BASE_URL`) and its inspection           |
| `pnpm adopt --remove-demo`                              | Remove starter-only code (`--remove-reference`, `--dry-run`)              |
| `pnpm i18n:pseudo`                                      | Regenerate the pseudo-locale after copy changes                           |

<!-- starter:demo-start -->

The starter also builds its labelled demo with `pnpm build:demo` (the
GitHub Pages preview); adoption removes it.

<!-- starter:demo-end -->

Commit messages are single-line Conventional Commits (enforced).

## Make it yours

Read [docs/adoption.md](docs/adoption.md): `pnpm adopt --remove-demo`, point
`VITE_API_BASE_URL` at your API, keep or replace the cookie-session auth
adapter, replace the placeholder screens, and build features with
`pnpm gen`.

## Documentation

| Topic                     | Doc                                                                        |
| ------------------------- | -------------------------------------------------------------------------- |
| Agent instructions        | [AGENTS.md](AGENTS.md) (Claude Code: [CLAUDE.md](CLAUDE.md))               |
| Recipes and generators    | [docs/recipes/README.md](docs/recipes/README.md)                           |
| Pages from images         | [docs/recipes/compose-from-images.md](docs/recipes/compose-from-images.md) |
| Overview                  | [docs/architecture.md](docs/architecture.md)                               |
| Guardrails (rule → check) | [docs/guardrails.md](docs/guardrails.md)                                   |
| Module boundaries         | [docs/architecture/boundaries.md](docs/architecture/boundaries.md)         |
| UI foundation and forms   | [docs/ui/foundation.md](docs/ui/foundation.md)                             |
| Session lifecycle         | [docs/session-lifecycle.md](docs/session-lifecycle.md)                     |
| Routing and flows         | [docs/routing.md](docs/routing.md), [docs/flows.md](docs/flows.md)         |
| Configuration             | [docs/configuration.md](docs/configuration.md)                             |
| Animation                 | [docs/animation-system.md](docs/animation-system.md)                       |
| Adoption                  | [docs/adoption.md](docs/adoption.md)                                       |
| Decisions                 | [docs/decisions/](docs/decisions/README.md)                                |
| Migrating older copies    | [docs/migration-notes.md](docs/migration-notes.md)                         |
| Task template             | [docs/task-template.md](docs/task-template.md)                             |
| Security and dependencies | [SECURITY.md](SECURITY.md)                                                 |
| Mobile (optional)         | [docs/mobile-capacitor.md](docs/mobile-capacitor.md)                       |

## Deployment

`VITE_API_BASE_URL=https://api.example.com pnpm build` produces static files
in `dist/`; `pnpm check:build` verifies budgets and that no demo, mock or
test code shipped. Hash routing works on any static host; for a sub-path set
`BASE_PATH=/sub/` (GitHub Pages: `GITHUB_PAGES=true`). Session cookies, CORS
and CSRF: [docs/session-lifecycle.md](docs/session-lifecycle.md).

<!-- starter:demo-start -->

The included Pages workflow publishes the starter's **demo** build only;
adopted projects add their own deployment.

<!-- starter:demo-end -->
