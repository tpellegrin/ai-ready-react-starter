# 0010 — Validated configuration and composition root

## Status

Accepted (2026-10)

## Decision

- All configuration is `VITE_*` build-time variables parsed by one Zod schema
  (`src/config/schema.ts`), used by `vite.config.ts` (dev server, builds,
  tests) and at runtime. Only `src/config` reads `import.meta.env`.
- Code that must be absent from a build is gated with build flags
  (`DEMO_MODE`, `MOCKS_ENABLED`) plus dynamic `import()`, so bundlers drop it.
- `src/main.tsx` + `src/containers/composition/` are the composition root:
  they choose the auth adapter from config, start mocks when enabled and pass
  the adapter and query client into `App` as props.
- Demo mode is explicit and labelled; invalid combinations (demo auth without
  demo mode, mocks or plain-HTTP APIs in a real production build) fail the
  build.

## Why

Documented variables were unused, the mock auth adapter was hardwired (a
production build signed in a fake user) and mocks shipped in every bundle.

## Consequences

- `VITE_*` values are public; secrets never go in them (`SECURITY.md`).
- Tests and stories inject adapters and clients instead of relying on module
  state.
- `pnpm check:build` verifies the absence of demo/mock code in real builds.

## Change guidance

Add variables as described in `docs/configuration.md`. Add auth providers
with a schema value and a `createAuthAdapter` case
(`docs/recipes/real-auth-adapter.md`).
