# Adoption guide

How to turn the starter into your product. Most of the work is automated
and verified; the rest is replacing the few screens that are placeholders.

## What is what

| Kind                                      | Where                                                                                                                                                                                                                                        | On adoption                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Infrastructure**                        | `src/config`, `src/api`, `src/auth`, `src/forms`, `src/components`, `src/styles`, `src/i18n`, `src/hooks`, `src/utils`, `src/globals`, `src/flows`, `src/guards`, `src/containers`, `src/mocks` (session + helpers), `src/test`, scripts, CI | Keep; extend                                                                 |
| **Demo** (group `demo`)                   | `src/demo` (DemoHub start page, demo auth adapter, public onboarding preview), `.env.demo`, `pnpm build:demo`, the GitHub Pages workflow, `e2e/demo`                                                                                         | `pnpm adopt --remove-demo`                                                   |
| **Reference feature** (group `reference`) | `src/features/resources`, `src/views/user/Resources`, its route, nav link, Dashboard card, mocks and copy                                                                                                                                    | `pnpm adopt --remove-reference` once your first feature follows its patterns |
| **Placeholder screens**                   | `views/guest/Welcome`, `views/guest/SignIn`, `views/user/Dashboard`, `views/onboarding/*`                                                                                                                                                    | Replace by hand (below)                                                      |

The groups are declared in `starter.manifest.json`, which also records the
starter version your project came from. Keep that file.

## 1. Remove starter-only code

```bash
pnpm adopt --remove-demo --dry-run     # shows every file, region, script and i18n key it would touch
pnpm adopt --remove-demo               # add --remove-reference when you are ready
pnpm validate
```

`adopt` deletes the files listed in the manifest, removes package scripts and
i18n keys, regenerates the pseudo-locale, rewrites the marked regions in
shared files and formats the result. Marked regions look like this:

```ts
// starter:demo-start
guest: mergeRoutes(GuestRoutes, DEMO_MODE ? createDemoGuestRoutes() : []),
// starter:demo-else
// guest: GuestRoutes,
// starter:demo-end
```

Lines between `start` and `end` are removed; lines after `else` are
uncommented instead. Every marker is validated before anything is written,
so a broken marker stops the command with nothing changed. It works with or
without git (it reads `git ls-files` when available).

After `--remove-demo`: the only auth provider is `session`, `pnpm start` uses
the session adapter against the MSW mock backend (`src/mocks/session.ts`),
and the guest start page is Welcome.

`pnpm adopt:check` proves all of this on temporary copies (demo only,
reference only, both) against typecheck, lint, Stylelint, Prettier, i18n,
architecture fixtures, unit tests with coverage floors, and a production
build with inspection. Run it after changing demo/reference code.

## 2. Wire the real backend

1. **API URL**: set `VITE_API_BASE_URL` in your deployment environment
   ([configuration](configuration.md)). Production builds fail without it.
2. **Auth**: keep the cookie-session adapter if your API matches its
   contract, or add your provider
   ([recipe](recipes/real-auth-adapter.md)).
3. **Mocks**: keep MSW handlers in sync with the real API while you develop,
   or set `VITE_ENABLE_MOCKS=false` in `.env.development` to develop against
   a running backend.

## 3. Replace the placeholder screens

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
- **Features**: add them with `pnpm gen feature <name>`
  ([recipe](recipes/new-feature.md)); remove the reference feature when it
  no longer helps.

## 4. Make it look and read like your product

- `VITE_APP_NAME` (title, header, Welcome heading).
- Theme tokens in `src/styles/themes` (colors, typography, spacing, radii,
  focus, feedback). Components use tokens only.
- Fonts in `src/assets/fonts` + `src/styles/fonts.ts`.
- Locales in `src/i18n/locales` (keep every locale in sync; `pnpm i18n:check`).
- Capacitor is optional ([mobile-capacitor.md](mobile-capacitor.md)); remove
  `@capacitor/core` and `capacitor.config.ts` if you do not need it.

## 5. Deploy

`pnpm build` with your environment, then `pnpm check:build` (budgets, no
demo/mock code). Static hosting works anywhere thanks to hash routing; for a
sub-path set `BASE_PATH=/sub/`. Add a deployment workflow for your host — the
removed GitHub Pages workflow only published the starter's demo.

## Checklist

- [ ] `pnpm adopt --remove-demo` (and later `--remove-reference`)
- [ ] `VITE_API_BASE_URL`, auth provider and session contract confirmed
- [ ] Placeholder screens replaced, copy translated
- [ ] Theme, fonts, app name updated; README describes your product
- [ ] `pnpm verify` passes (or at least `pnpm validate`, `pnpm build`,
      `pnpm check:build`)
- [ ] `starter.manifest.json` kept for provenance

## For AI agents

Read `AGENTS.md`. Never delete demo/reference code by hand: use
`pnpm adopt` so markers, scripts, copy and tests stay consistent. When you
add code that should disappear with a group, list its files in
`starter.manifest.json` or wrap its references in markers, then run
`pnpm adopt:check`.
