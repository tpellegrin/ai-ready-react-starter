# Security policy

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private vulnerability
reporting (repository **Security** tab → **Report a vulnerability**). Include
the affected version or commit, reproduction steps and the impact you expect.
You should get an acknowledgement within a week; fixes for confirmed issues
land on `main` and are described in the advisory.

Supported version: the latest commit on `main` (this is a starter; adopted
projects own their copy and should apply the same policy).

## What this frontend protects (and what it cannot)

- **`VITE_*` values are public.** They are inlined into the JavaScript bundle
  at build time. Never put secrets in `.env*` files; the config schema only
  accepts public settings (see `docs/configuration.md`).
- **Sessions use HttpOnly cookies** via the session adapter
  (`src/auth/adapters/session.ts`); the app never stores tokens in
  app-readable storage. Browser storage (`localStorage`, `sessionStorage`,
  `indexedDB`, `document.cookie`) is lint-restricted to auth adapters, the
  language preference and mocks (`no-restricted-globals`/`-properties` in
  `eslint.config.js`, with fixtures in `pnpm arch:check`).
- **Requests go through one client** (`src/api/http`): raw `fetch`, XHR,
  WebSocket and EventSource are lint errors elsewhere, and absolute request
  paths are refused, so credentials are only sent to the configured API.
- **Demo and mock code never ships in real builds.** Demo auth signs in
  anyone, so it requires `VITE_DEMO_MODE=true`, which production builds of a
  product must not set. `pnpm check:build` fails a production build that
  contains demo, mock, MSW, test or story code, or source maps.
- **Design references and plans stay out of builds.** Screenshots in
  `design/<task>/references` can contain private data: keep such images out
  of git (or the task folder out of the repository) and remember that
  capture reports copy them into `reports/design/`. `pnpm check:build`
  fails a build that includes anything from `design/` or `reports/`, and
  composition plans are data: no field is executed, and reports escape
  their text.
- **Untrusted input is parsed, not cast:** API responses (Zod schemas in the
  HTTP client), redirect targets (`returnTo` allow-list against known
  routes) and storage reads.
- **CSRF and authorization are the server's job.** The client sends the
  session's CSRF token on unsafe methods when the server provides one, and
  credentialed requests only to the configured API; the server must check
  the token (and `Origin`/`Sec-Fetch-Site`) on every state-changing request,
  answer CORS for the app origin only, and authorize every request. Cookie
  attributes, CORS and CSRF: `docs/session-lifecycle.md`.
- **Out of scope for a frontend:** rate limiting and Content-Security-Policy
  headers are the backend's/host's job. Configure a CSP that allows only
  your API origin when you deploy.

## Dependency policy

- **Production dependencies must audit clean.** CI runs
  `pnpm audit --prod --audit-level=high` on every change; a new high/critical
  advisory in runtime code blocks merging until it is fixed or a documented
  exception is added here.
- **Dependabot** proposes grouped weekly updates after a 14-day cooldown
  (`.github/dependabot.yml`); security updates are opened immediately.
  Majors of the core stack (React, React Router, Vite, TypeScript minors) are
  planned upgrades with an ADR and migration notes, not routine merges.
- **Prefer in-range fixes.** Update the vulnerable transitive package within
  its semver range (`pnpm update --no-save --depth Infinity <pkg>`) and
  check the lockfile diff. Use `pnpm.overrides` only when a dependency pins a
  vulnerable version exactly, and record it below.
- Every update passes `pnpm verify` before merging.

### Overrides

| Override                        | Why                                                                                                           | Remove when                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `handlebars@<4.7.10` → `4.7.10` | `eslint-plugin-boundaries` 7.2.0 pins 4.7.9 exactly (critical advisories). Lint-time only, trusted templates. | The plugin ships with a patched `handlebars`. |

### Accepted development-only advisories

Re-checked on 2026-10-20 (`pnpm audit`). None of these packages is part of the
browser bundle (`pnpm check:build` inspects every shipped module).

| Package (via)                                                             | Status                                                                                                  | Plan                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `stylelint-config-rational-order` (bundles stylelint 9, old postcss etc.) | Unmaintained since 2019; advisories are in its private copy of stylelint 9. Lints local, trusted files. | Replace with a maintained property-order config and run `stylelint --fix`. |
| `braces` ≤ 3.0.3 (micromatch/fast-glob in lint tooling)                   | No patched release exists yet.                                                                          | Picked up automatically by Dependabot when a fix is published.             |
| `@babel/core` < 7.29.6 (low)                                              | Forcing the update lets a loosely-ranged dependent resolve Babel 8.                                     | Resolves with the next `@vitejs/plugin-react`/Storybook update.            |
