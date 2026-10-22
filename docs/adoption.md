# Adoption guide

How to turn the starter into your product. Most of the work is automated
and verified; the rest is replacing the few placeholder screens and
building your features with the generators.

## What is what

| Kind                                      | Where                                                                                                                                                                                                                                        | On adoption                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Infrastructure**                        | `src/config`, `src/api`, `src/auth`, `src/forms`, `src/components`, `src/styles`, `src/i18n`, `src/hooks`, `src/utils`, `src/globals`, `src/flows`, `src/guards`, `src/containers`, `src/mocks` (session + helpers), `src/test`, scripts, CI | Keep; extend                                                                 |
| **Demo** (group `demo`)                   | `src/demo` (DemoHub start page, demo auth adapter, public onboarding preview), `.env.demo`, `pnpm build:demo`, the GitHub Pages workflow, `e2e/demo`                                                                                         | `pnpm adopt --remove-demo`                                                   |
| **Reference feature** (group `reference`) | `src/features/resources`, `src/views/user/Resources`, its route, nav link, Dashboard card, mocks, copy, tests and doc paragraphs                                                                                                             | `pnpm adopt --remove-reference` once your first feature follows its patterns |
| **Placeholder screens**                   | `views/guest/Welcome`, `views/guest/SignIn`, `views/user/Dashboard`, `views/onboarding/*`                                                                                                                                                    | Replace by hand (below)                                                      |

The groups are declared in `starter.manifest.json`. Keep that file: it
records the starter version, which groups were removed and — from the first
adoption run — the starter commit the project started from
(`adoption.starterRevision`, `uncommittedChanges` if the tree was dirty).
Run the first adoption on a fresh clone, before your own commits, so that
commit is the starter's.

## What changes for you and your agents

Before adoption (`adoption: null`) the repository is the starter, and
everything stays domain-neutral. After the first `pnpm adopt` it is **your
product**: AGENTS.md's rules switch accordingly.

- **Use your domain.** Features, views, copy, tests and fixtures use your
  real terms (`invoices`, `Patient`, `checkout`) and business rules.
- **Keep the architecture.** Shared layers (`src/components`, `src/api`,
  `src/auth`, `src/forms`, `src/styles`, …) stay neutral and reusable; the
  layer matrix, component public APIs, data/forms/session patterns, copy,
  accessibility and every check still apply.
- **Keep the tools.** `pnpm gen`, `pnpm catalog`, `pnpm verify` and their
  `starter:gen` markers keep working after adoption (proven by
  `pnpm adopt:check`).
- **Evolve deliberately.** Budgets, floors and rules grow with the product
  ([guardrails](guardrails.md#evolving-limits-deliberately)); record
  architecture changes as ADRs.

## 1. Remove starter-only code

```bash
pnpm adopt --remove-demo --dry-run     # shows every file, region, script and i18n key it would touch
pnpm adopt --remove-demo               # add --remove-reference when you are ready
pnpm validate
```

`adopt` deletes the files listed in the manifest, removes package scripts
and i18n keys, regenerates the pseudo-locale, rewrites the marked regions in
shared files (code, config and Markdown) and formats the result. Marked
regions in code look like this:

```ts
// starter:demo-start
guest: mergeRoutes(GuestRoutes, DEMO_MODE ? createDemoGuestRoutes() : []),
// starter:demo-else
// guest: GuestRoutes,
// starter:demo-end
```

Lines between `start` and `end` are removed; lines after `else` are
uncommented instead. In Markdown a region is delimited by whole-line HTML
comments (`starter:reference-start` and `starter:reference-end` inside
`<!-- … -->`, each on its own line between blank lines), so docs describing
removed code disappear with it. Every marker is validated before anything
is written, so a broken marker stops the command with nothing changed. It
works with or without git.

After `--remove-demo`: the only auth provider is `session`, `pnpm start`
uses the session adapter against the MSW mock backend
(`src/mocks/session.ts`), and the guest start page is Welcome.

`pnpm adopt:check` proves all of this on temporary copies — demo removed,
reference removed, both, and a `product` scenario that then generates a
domain feature, its page and navigation, renames the app and adds product
code on top (`scripts/adoption/product`: a create form, and a browser
journey through the generated page's navigation, loading, content, empty
and error states, validation, a failed save and a retry) — by running each
adopted project's own `pnpm verify` (lint, types, docs, architecture, unit,
coverage, build inspection, Storybook, e2e, generators). Run it after
changing demo or reference code.

## 2. Wire the real backend

1. **API URL**: set `VITE_API_BASE_URL` in your deployment environment
   ([configuration](configuration.md)). Production builds fail without it.
2. **Auth**: keep the cookie-session adapter if your API matches its
   contract, or add your provider ([recipe](recipes/real-auth-adapter.md)).
   Cookies, CORS and CSRF: [session lifecycle](session-lifecycle.md).
3. **Mocks**: keep MSW handlers in sync with the real API while you develop,
   or set `VITE_ENABLE_MOCKS=false` in `.env.development` to develop against
   a running backend.

## 3. Build your product

- **Features:** `pnpm gen feature <name>`, then `pnpm gen view <Page>
--group user --feature <name> --nav` ([recipes](recipes/README.md)).
- **Sign in** (`views/guest/SignIn`): keep the form pattern (`logic.ts` with
  React Hook Form + Zod, `Field`), change fields/copy for your auth.
- **Welcome** (`views/guest/Welcome`) and **Dashboard**
  (`views/user/Dashboard`): replace freely; signed-in pages compose
  `UserPageLayout` (navigation, sign-out, page `h1`).
- **Onboarding** (`views/onboarding`): replace the steps with yours, keeping
  the flow contract ([flows.md](flows.md)). If you need no onboarding, keep
  the group but return users with `needsOnboarding: false` from your adapter
  (the onboarding group is then never mounted); delete the step views and
  their copy when nothing links to them.
- **Tests that name placeholder copy** (e.g. e2e specs asserting the Welcome
  heading) change with the screens you replace.

## 4. Make it look and read like your product

- `VITE_APP_NAME` in every `.env.*` file (title, header, Welcome heading).
- Theme tokens in `src/styles/themes` (colors, typography, spacing, radii,
  focus, feedback). Components use tokens only.
- Fonts in `src/assets/fonts` + `src/styles/fonts.ts`.
- Locales in `src/i18n/locales` (keep every locale in sync;
  `pnpm i18n:check`).
- `package.json` `name`, README and LICENSE are yours to change.
- Capacitor is optional ([mobile-capacitor.md](mobile-capacitor.md)); remove
  `@capacitor/core` and `capacitor.config.ts` if you do not need it.

## 5. Deploy

`pnpm build` with your environment, then `pnpm check:build` (budgets, no
demo/mock code). Static hosting works anywhere thanks to hash routing; for a
sub-path set `BASE_PATH=/sub/`. Add a deployment workflow for your host —
the removed GitHub Pages workflow only published the starter's demo.

## Checklist

- [ ] `pnpm adopt --remove-demo` (and later `--remove-reference`)
- [ ] `VITE_API_BASE_URL`, auth provider and session contract confirmed
      (cookies, CORS, CSRF)
- [ ] Placeholder screens replaced, copy translated
- [ ] Theme, fonts, app name updated; README describes your product
- [ ] `pnpm verify` passes
- [ ] `starter.manifest.json` kept for provenance

## For AI agents

Read `AGENTS.md`. Never delete demo or reference code by hand: use
`pnpm adopt` so markers, scripts, copy, docs and tests stay consistent. In
the starter, when you add code that should disappear with a group, list its
files in `starter.manifest.json` or wrap its references in markers, then run
`pnpm adopt:check`.
