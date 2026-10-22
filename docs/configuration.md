# Configuration

All configuration comes from `VITE_*` variables, validated by one Zod schema
(`src/config/schema.ts`) in two places: by `vite.config.ts` when the dev
server, a build or the tests start, and again at runtime. Application code
reads it only through `src/config` (`appConfig`, build flags, `basePath`);
reading `import.meta.env` anywhere else is a lint error.

> **`VITE_*` values are public.** Vite inlines them into the JavaScript
> bundle at build time. Never put secrets in them. Changing a value requires
> a rebuild — this is build-time configuration, not runtime configuration.

## Variables

| Variable             | Required | Values                                    | Meaning                                                                                                                                               |
| -------------------- | -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_NAME`      | no       | non-empty text (default `React Starter`)  | Display name (document title, header, Welcome heading).                                                                                               |
| `VITE_API_BASE_URL`  | **yes**  | `https://…`, `http://localhost…`, `/path` | API origin or root-relative path, no trailing slash needed.                                                                                           |
| `VITE_AUTH_PROVIDER` | **yes**  | `session` (starter also: `demo`)          | Which `AuthAdapter` the composition root wires.                                                                                                       |
| `VITE_DEMO_MODE`     | no       | `true` / `false` (default `false`)        | Labelled demo/preview build: allows mocks in a production build; in the starter it also enables demo auth, DemoHub and the public onboarding preview. |
| `VITE_ENABLE_MOCKS`  | no       | `true` / `false` (default `false`)        | Start the MSW worker (in-browser mock API) before rendering.                                                                                          |

Booleans must be exactly `true` or `false` (`yes`, `1`, `TRUE` are rejected
instead of guessed). Empty values count as unset.

### Rules that make invalid combinations unbuildable

- `VITE_AUTH_PROVIDER=demo` requires `VITE_DEMO_MODE=true` (the demo adapter
  signs in anyone).
- In a production build (`vite build`) without demo mode:
  `VITE_ENABLE_MOCKS=true` is rejected, and `VITE_API_BASE_URL` must use
  `https://` (plain `http://` only for localhost).
- Every problem is reported at once, with a pointer to this page:

```
Invalid application configuration:
  - VITE_API_BASE_URL is required
  - VITE_ENABLE_MOCKS=true is not allowed in a production build unless VITE_DEMO_MODE=true.
See .env.example and docs/configuration.md.
```

## Modes and committed defaults

| Command           | Mode          | File               | Setup                                                                          |
| ----------------- | ------------- | ------------------ | ------------------------------------------------------------------------------ |
| `pnpm start`      | `development` | `.env.development` | Mock API (MSW); demo auth in the starter, session after adoption               |
| `pnpm test*`      | `test`        | `.env.test`        | Tests start the MSW Node server themselves                                     |
| `pnpm storybook*` | `storybook`   | `.env.storybook`   | Mock API for stories that fetch                                                |
| `pnpm build`      | `production`  | `.env.production`  | Session auth, no mocks; **`VITE_API_BASE_URL` must come from the environment** |

<!-- starter:demo-start -->

The starter also has `pnpm build:demo` (mode `demo`, `.env.demo`): the
labelled demo build behind its GitHub Pages preview. Adoption removes it.

<!-- starter:demo-end -->

Override locally with `.env.local` / `.env.<mode>.local` (gitignored), or with
real environment variables in CI/CD (they win over files). Example:

```bash
VITE_API_BASE_URL=https://api.example.com pnpm build
```

Storybook pins `.env.storybook` explicitly (`.storybook/vite.config.ts`),
because Storybook itself loads `.env.<NODE_ENV>` into `process.env` first.

## Build flags vs `appConfig`

- `appConfig` (`src/config/index.ts`) is the parsed, typed object for normal
  use.
- `DEMO_MODE`, `MOCKS_ENABLED`, `IS_DEV` (`src/config/buildFlags.ts`) compare
  string literals that Vite replaces at build time. Use them — not
  `appConfig` — to gate code that must be **physically absent** from a build
  (`if (MOCKS_ENABLED) await import('mocks/browser')`). `pnpm check:build`
  verifies that real builds contain no demo or mock code.

## Base path

Assets are served from `/` unless:

- `BASE_PATH=/sub/` is set (must start and end with `/`), or
- `GITHUB_PAGES=true` derives `/<repo>/` from `GITHUB_PAGES_REPO` or
  `GITHUB_REPOSITORY`.

Routing uses hash URLs (`/#/resources`), so only asset URLs depend on the
base. `pnpm check:build --base /sub/` verifies `index.html` references, and
the e2e suite runs the demo build under a sub-path.

## Adding a variable

1. Add it to `envSchema` (and `AppConfig`) in `src/config/schema.ts`, with
   cross-field rules in `parseAppConfig` if needed.
2. Declare it in `src/vite-env.d.ts` (strict `import.meta.env`: undeclared
   variables do not type-check).
3. Document it in `.env.example` and in the table above; set it in the
   committed `.env.*` files that need it.
4. Add cases to `src/config/schema.test.ts`.
