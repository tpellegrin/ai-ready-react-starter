# Adoption Guide

## Purpose

This guide helps you turn the boilerplate into your own application.
It explains which parts are reusable infrastructure, which parts are demo-only,
and how to replace the demo content safely without breaking the architecture.

The goal: a new user (human or AI agent) should be able to make this template
their own in under 15 minutes.

For deeper architectural context, read alongside:

- [README.md](../README.md)
- [AGENTS.md](../AGENTS.md)
- [.junie/guidelines.md](../.junie/guidelines.md)
- [docs/architecture.md](architecture.md)
- [docs/how-to-extend.md](how-to-extend.md)
- [docs/what-not-to-do.md](what-not-to-do.md)

---

## What to preserve

These pieces are reusable infrastructure. You should usually keep them and
extend them, not delete them.

- **App shell / provider composition** — `src/containers/App.tsx`
- **App-state-based routing** — `src/containers/AppRouter.tsx`,
  `src/containers/Router/`
- **Layouts** — `src/containers/Layouts/MainLayout`,
  `src/containers/Layouts/FlowLayout`, `src/containers/Layouts/Shells`,
  `src/containers/Layouts/common`
- **Auth adapter boundary** — `src/auth/types.ts`, `src/auth/AuthProvider.tsx`,
  `src/auth/useAuth.ts`
- **API / query layer** — `src/api/queryKeys.ts`,
  `src/globals/react-query.ts`, the `src/api/` folder convention
- **Theme & design tokens** — `src/styles/`
- **Component primitives** — `src/components/`
- **i18n setup** — `src/i18n/index.ts`, `src/i18n/provider.tsx`
- **Flow layout system** — `src/flows/fromPaths.ts`, `src/hooks/useFlowNav`,
  `src/hooks/useFlowProgress`
- **Animation system** — see [docs/animation-system.md](animation-system.md)
- **Route guards / navigation context** — `src/guards/`,
  `src/globals/context/NavigationContext`
- **Validation scripts** — `scripts/i18n-check.cjs`, `pnpm validate`
- **CI workflows** — `.github/` (if present)
- **AI guardrails / docs** — `AGENTS.md`, `.junie/AGENTS.md`,
  `.junie/guidelines.md`, `docs/`
- **Testing setup** — `src/test/`, `vitest.config.ts`
- **Build & tooling config** — `vite.config.ts`, `tsconfig*.json`,
  `eslint.config.js`, `commitlint.config.cjs`, `capacitor.config.ts`

---

## What is demo-only

These files exist only to demonstrate the architecture. They are safe to
replace or remove when adopting the boilerplate.

- **Demo auth adapter** — `src/auth/mockAdapter.ts`
- **Demo API** — `src/api/demoApi.ts`, `src/api/demoApi.test.ts`
- **Demo SignIn view** — `src/views/guest/SignIn/`
- **Demo Welcome (guest) view** — `src/views/guest/Welcome/`
- **Demo Dashboard (authenticated) view** — `src/views/user/Dashboard/`
- **Demo onboarding flow screens** —
  `src/views/onboarding/Welcome/`,
  `src/views/onboarding/Preferences/`,
  `src/views/onboarding/Complete/`
- **Demo Hub / Starter Overview** —
  `src/views/guest/DemoHub/`. Registered as the **default guest index**
  route (`/`) and also at the alias `/demo` in `src/views/guest/index.tsx`.
  Path constants live in `src/globals/paths.ts` (`guestPaths.demo`).
  This is the first screen users see when opening the app locally
- **Demo i18n keys** — `signIn.*`, `dashboard.*`, `onboarding.*`,
  `welcome.*`, `demoHub.*`, and `app.welcome.demoHubCta` entries inside
  `src/i18n/locales/en-US.json`, `es-ES.json`, `pt-BR.json`, `pseudo.json`
- **Demo tests** — `src/auth/AuthProvider.test.tsx`,
  `src/views/onboarding/__tests__/`, and any test that asserts demo copy

Do **not** treat the surrounding folders (`src/auth/`, `src/api/`,
`src/views/`, `src/i18n/`) as disposable. They are infrastructure.

---

## Mixed areas

Some files contain both reusable infrastructure and demo wiring. In these,
keep the structure and replace only the demo-specific bits.

- **`src/auth/AuthProvider.tsx`** — Preserve the provider, context, and
  adapter boundary. Replace the import that wires `mockAdapter` with your
  real adapter.
- **`src/containers/AppRouter.tsx`** — Preserve the Guest/Onboarding/User
  router switch. Replace the routes inside each router as your views change.
- **`src/containers/Router/index.tsx`** — Preserve route composition.
  Update only the route paths/elements that point to demo views.
- **`src/i18n/locales/*.json`** — Preserve the file format, supported
  locales, and shared keys (e.g. `common.*`, `errors.*`, layout keys).
  Remove only demo screen keys and add your own.
- **`src/views/index.tsx` files (`guest`, `user`, `onboarding`)** — Preserve
  the barrel/router pattern; swap which views are exported.
- **`src/flows/fromPaths.ts`** — Preserve the helper. The
  `onboarding`-specific path list it powers is the demo flow; you can
  replace its inputs without rewriting the helper.
- **`README.md`** — Preserve sections about architecture, validation, and
  tooling. Replace the title, project name, description, and the Features
  list to match your product.
- **`.env.example`** — Preserve variable names you reuse; add/remove ones
  specific to your real backend.
- **`index.html`** — Preserve the mount point and Vite wiring; replace
  title and metadata.

---

## Make it yours: quick path

A focused checklist. Use exact paths.

1. **Rename the app**
   - `package.json` → `name`, `description`
   - `index.html` → `<title>`, meta tags
   - `README.md` → top heading and intro
   - `.env.example` → `VITE_APP_NAME`
2. **Update package metadata** — `package.json` (`version`, `license`,
   `repository`, `author` if you add one).
3. **Update `index.html`** — title, description, theme-color, favicon in
   `public/`.
4. **Update README project name** — replace
   "React 19 + Vite + TypeScript Boilerplate" with your app name.
   Keep the architecture and validation sections.
5. **Configure `.env`** — `cp .env.example .env`, then set
   `VITE_API_BASE_URL`, auth variables, and feature flags.
6. **Replace demo auth adapter** — implement `AuthAdapter` from
   `src/auth/types.ts` in a new file (e.g. `src/auth/myAdapter.ts`),
   wire it inside `src/auth/AuthProvider.tsx`, then delete
   `src/auth/mockAdapter.ts`.
7. **Replace demo API** — add real modules under `src/api/` and extend
   `src/api/queryKeys.ts`. Delete `src/api/demoApi.ts` and
   `src/api/demoApi.test.ts` once nothing imports them.
8. **Decide whether to keep onboarding/flows** — if not needed, remove
   `src/views/onboarding/` and the Onboarding branch in
   `src/containers/AppRouter.tsx`. Keep `src/containers/Layouts/FlowLayout`
   and `src/flows/fromPaths.ts` for future flows.
9. **Replace demo views** — replace
   `src/views/guest/SignIn`, `src/views/guest/Welcome`, and
   `src/views/user/Dashboard` with your real views. Keep the
   `src/views/{guest,user}/index.tsx` barrel and the layout wrappers.
10. **Prune or update i18n keys** — remove demo keys from every file in
    `src/i18n/locales/` and add your own. Run `pnpm i18n:check`.
11. **Update theme/branding** — edit tokens in `src/styles/` (theme,
    colors, typography). Do not hardcode visual values in components.
12. **Run validation** — `pnpm validate` and `pnpm build`.
13. **Configure GitHub Pages** (Optional) — If deploying to a GitHub Pages project site (`https://<owner>.github.io/<repo-name>/`), the boilerplate is already hardened for this. Ensure the `deploy-pages.yml` workflow is active. For `public/` assets, use `import.meta.env.BASE_URL` as a prefix.

---

## Replace auth

The boilerplate exposes auth through an adapter boundary. Keep it.

**Keep**

- `src/auth/types.ts` — the `AuthAdapter` and `User` contracts.
- `src/auth/AuthProvider.tsx` — provider + context.
- `src/auth/useAuth.ts` — the only consumption point for views.

**Replace**

- `src/auth/mockAdapter.ts` with your real adapter (Auth0, Firebase,
  Cognito, custom backend, etc.). Implement every method from
  `AuthAdapter`.

**Do not**

- Read tokens directly from `localStorage`/cookies in views.
- Import your auth SDK outside `src/auth/`.
- Bypass `useAuth` to access user state.
- Add a parallel auth provider.

**Validation / tests**

- Update or replace `src/auth/AuthProvider.test.tsx` to use your adapter
  (or a test double of it).
- Re-run `pnpm test:run` and `pnpm validate`.

---

## Replace API / query

The data layer is centralized so views never call `fetch` directly.

**Where API functions should live**

- All HTTP calls under `src/api/<resource>.ts` (e.g. `src/api/users.ts`).
- React Query is configured in `src/globals/react-query.ts`. Do not create
  a second `QueryClient`.

**How query keys should be extended**

- Add new keys to `src/api/queryKeys.ts`. Keep them grouped by resource
  and namespaced (e.g. `users.list`, `users.detail(id)`).

**How to avoid scattered fetch calls**

- Views call `useQuery`/`useMutation` referencing functions from
  `src/api/`, never `fetch`/`axios` inline.
- Shared error handling and retries belong in the query client config or
  in the API module, not in views.

Once unused, remove `src/api/demoApi.ts` and `src/api/demoApi.test.ts`.

---

## Remove or replace onboarding flow

Decide first: do you need a multi-step onboarding?

**Inspect**

- Routes: `src/containers/AppRouter.tsx`, `src/containers/Router/index.tsx`
- Flow screens: `src/views/onboarding/{Welcome,Preferences,Complete}/`
- Flow helpers: `src/flows/fromPaths.ts`, `src/hooks/useFlowNav`,
  `src/hooks/useFlowProgress`
- Layout: `src/containers/Layouts/FlowLayout`

**Tests to update**

- `src/views/onboarding/__tests__/` — remove if onboarding is gone, or
  rewrite for your new flow.
- `src/containers/AppRouter.test.tsx` — update assertions that reference
  onboarding routes.

**i18n**

- Remove `onboarding.*` keys from every `src/i18n/locales/*.json` file.
- Run `pnpm i18n:check`.

**Keep regardless** the FlowLayout, `useFlowNav`, `useFlowProgress`, and
`fromPaths` helpers — they are infrastructure and useful for any future
multi-step flow.

---

## Demo Hub / Starter Overview

The boilerplate ships with a small in-app **Demo Hub** that helps new users
discover the available demo patterns on first run. It lives at:

- Default guest route: `/` renders the Demo Hub directly so it is the
  first screen users see when opening the app locally.
- Alias route: `/demo` (also resolves to the Demo Hub for backward
  compatibility with existing links/tests).
- View: `src/views/guest/DemoHub/index.tsx`.
- Test: `src/views/guest/DemoHub/__tests__/DemoHub.test.tsx` plus the
  default-route regression in
  `src/containers/AppRouter.defaultRoute.test.tsx`.
- Path constant: `guestPaths.demo` in `src/globals/paths.ts`.
- Route registration: `src/views/guest/index.tsx`.
- i18n keys: `demoHub.*` in every file under `src/i18n/locales/`.

The page is intentionally lightweight: a heading, a short intro, a few
cards linking to existing demo routes, and a removal note pointing back
to this guide. It does not introduce a new layout system, design-system
gallery, or extra dependency.

### When to remove

Remove the Demo Hub once the demo views it links to are gone, or once
your real product views have replaced them.

### How to remove

1. Delete the folder `src/views/guest/DemoHub/`.
2. In `src/views/guest/index.tsx`, point the `paths.index` route to your
   own landing component (or to `Welcome`) and remove both the `DemoHub`
   import and the alias route entry that uses `paths.demo`.
3. In `src/globals/paths.ts`, remove the `demo: '/demo'` entry from
   `guestPaths`.
4. Remove the `demoHub.*` block from every file in
   `src/i18n/locales/`.
5. Delete `src/containers/AppRouter.defaultRoute.test.tsx` (or rewrite it
   to assert your own landing page).
6. Run `pnpm i18n:check` to confirm locale parity, then
   `pnpm validate` and `pnpm build`.

The Demo Hub is also flagged with `// DEMO:` comments at every touch
point so AI agents can locate and remove it deterministically.

---

## Replace example views

The demo views are SignIn, guest Welcome, user Dashboard, and the three
onboarding screens.

When replacing them:

- **Keep** the layout wrappers (`MainLayout`, `FlowLayout`, `Shells`),
  the `views/{guest,user,onboarding}/index.tsx` barrels, and provider
  access via `useAuth` + React Query.
- **Replace** the screen components themselves and any demo-specific
  styled components inside them.
- **Do not** introduce a second routing system or duplicate provider.

If you remove a view, also remove its route in
`src/containers/Router/index.tsx` (or the matching sub-router) and its
i18n keys.

---

## Update i18n

- **Source locale**: `en-US` (`src/i18n/locales/en-US.json`).
- **Supported locales**: `en-US`, `es-ES`, `pt-BR`, plus `pseudo`
  (for visual i18n debugging).
- All locales must contain the same keys; add new keys to every file or
  the i18n check will fail.
- Use `useTranslation` / `t()` inside views. Do not hardcode user-facing
  copy.
- **Check command**: `pnpm i18n:check`.

After deleting demo screens, prune their keys from all locale files and
re-run the check.

---

## Update theme / branding

- App name: `package.json#name`, `index.html` `<title>`,
  `.env.example` `VITE_APP_NAME`.
- Colors, typography, spacing, radii: `src/styles/` design tokens and
  themes.
- Fonts and global styles: `src/styles/`.
- Logos / favicons: `public/` and `src/assets/`.

Avoid hardcoded colors, hex values, font sizes, or spacing inside
components — always go through theme tokens.

---

## Optional platform / deployment setup

- Mobile (Capacitor): see [docs/mobile-capacitor.md](mobile-capacitor.md).
- Animation system: see [docs/animation-system.md](animation-system.md).
- Architecture & flows: see [docs/architecture.md](architecture.md) and
  [docs/flows.md](flows.md).

This guide intentionally does not duplicate those documents.

---

## Validation checklist

After adoption changes, run:

```bash
pnpm validate
pnpm build
```

`pnpm validate` runs Prettier, ESLint, Stylelint, TypeScript, the i18n
key check, and Vitest.

When auth, API, or routes change, also run focused tests, e.g.:

```bash
pnpm test:run src/auth
pnpm test:run src/api
pnpm test:run src/containers
```

---

## AI-agent notes

When an AI agent helps with adoption:

- Preserve infrastructure (auth provider, API layer, router, theme,
  layouts, i18n, flow system).
- Replace demo code through the documented boundaries (`AuthAdapter`,
  `src/api/` + `queryKeys`, layout wrappers, theme tokens).
- Do not create parallel auth, API, theme, or router systems.
- Do not introduce domain-specific examples (e.g. `Order`, `Patient`,
  `Checkout`) into the boilerplate itself; those belong in the adopted
  app.
- Cross-reference [AGENTS.md](../AGENTS.md),
  [.junie/guidelines.md](../.junie/guidelines.md), and
  [docs/what-not-to-do.md](what-not-to-do.md) before making changes.

---

## Common mistakes

- Deleting providers (`AuthProvider`, `QueryClientProvider`,
  `ThemeProvider`, `I18nProvider`) instead of replacing the adapter
  beneath them.
- Calling `fetch`/`axios` directly inside views instead of going through
  `src/api/` + React Query.
- Hardcoding user-facing copy instead of adding i18n keys.
- Hardcoding colors, spacing, or font sizes instead of using theme
  tokens.
- Removing `FlowLayout` or `useFlowNav` when only the demo onboarding
  screens should change.
- Forgetting to update tests and i18n keys after deleting demo routes.
- Introducing a second router, second `QueryClient`, or second theme
  source of truth.
