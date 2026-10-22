# React SPA starter

A compact, production-oriented foundation for React single-page apps:
React 19, Vite 7, TypeScript (strict), styled-components, React Router 7,
TanStack Query, Zod, React Hook Form and Radix primitives — with guardrails
that fail when the architecture, accessibility or bundle drift.

- **Validated configuration** and an explicit composition root; demo and mock
  code can never reach a real build.
- **Session-state routing** with protected groups, safe `returnTo` deep links
  and code-split routes.
- **Schema-validated HTTP client** + feature-owned server state, mocked with
  MSW in development, tests and Storybook.
- **Feature modules** with an enforced import matrix and a generator.
- **Accessible UI foundation** (forms, dialogs, toasts, feedback states)
  tested in a real browser with axe.
- **One removable reference feature** and an adoption command verified in CI.

## Quick start

Requirements: Node 24 LTS (`.nvmrc`) and pnpm 9 via Corepack
(`corepack enable`).

```bash
pnpm install
pnpm start          # http://localhost:3000, demo setup with the mock API
```

To run the Storybook and end-to-end suites locally, install Chromium once:
`pnpm exec playwright install chromium`.

## Commands

| Command                                                 | Purpose                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm start`                                            | Dev server                                                      |
| `pnpm validate`                                         | Format, lint, styles, types, i18n, architecture, unit tests     |
| `pnpm verify`                                           | Everything CI runs, locally                                     |
| `pnpm test` / `test:run` / `test:cov`                   | Unit tests (watch / once / with coverage floors)                |
| `pnpm storybook` / `test:storybook` / `storybook:build` | Component catalog, browser tests, static build                  |
| `pnpm test:e2e`                                         | Playwright against built apps                                   |
| `pnpm build` + `pnpm check:build`                       | Production build (needs `VITE_API_BASE_URL`) and its inspection |
| `pnpm build:demo`                                       | Labelled demo build (GitHub Pages preview of the starter)       |
| `pnpm gen feature <name>`                               | Scaffold a feature (`--dry-run` to preview)                     |
| `pnpm adopt --remove-demo`                              | Remove starter-only code (`--remove-reference`, `--dry-run`)    |
| `pnpm i18n:pseudo`                                      | Regenerate the pseudo-locale after copy changes                 |

Commit messages are single-line Conventional Commits (enforced).

## Make it yours

Read [docs/adoption.md](docs/adoption.md): remove the demo with
`pnpm adopt --remove-demo`, point `VITE_API_BASE_URL` at your API, keep or
replace the cookie-session auth adapter, replace the placeholder screens.

## Documentation

| Topic                     | Doc                                                                            |
| ------------------------- | ------------------------------------------------------------------------------ |
| Overview                  | [docs/architecture.md](docs/architecture.md)                                   |
| Agent instructions        | [AGENTS.md](AGENTS.md) (Claude Code: [CLAUDE.md](CLAUDE.md))                   |
| Guardrails (rule → check) | [docs/guardrails.md](docs/guardrails.md)                                       |
| Module boundaries         | [docs/architecture/boundaries.md](docs/architecture/boundaries.md)             |
| Configuration             | [docs/configuration.md](docs/configuration.md)                                 |
| Routing                   | [docs/routing.md](docs/routing.md), [docs/flows.md](docs/flows.md)             |
| UI foundation and forms   | [docs/ui/foundation.md](docs/ui/foundation.md)                                 |
| Recipes                   | [docs/recipes/](docs/recipes/) — new feature, data and forms, route, real auth |
| Task template             | [docs/task-template.md](docs/task-template.md)                                 |
| Animation                 | [docs/animation-system.md](docs/animation-system.md)                           |
| Decisions                 | [docs/decisions/](docs/decisions/) (ADRs 0001–0016)                            |
| Migrating older copies    | [docs/migration-notes.md](docs/migration-notes.md)                             |
| Security and dependencies | [SECURITY.md](SECURITY.md)                                                     |
| Mobile (optional)         | [docs/mobile-capacitor.md](docs/mobile-capacitor.md)                           |

## Deployment

`VITE_API_BASE_URL=https://api.example.com pnpm build` produces static files
in `dist/`; `pnpm check:build` verifies budgets and that no demo, mock or test
code shipped. Hash routing works on any static host; for a sub-path set
`BASE_PATH=/sub/` (GitHub Pages: `GITHUB_PAGES=true`). The included Pages
workflow publishes the starter's **demo** build only; adopted projects add
their own deployment.
