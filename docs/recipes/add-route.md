# Recipe: add a page or route

```bash
pnpm gen view Reports --group user --dry-run      # review the plan
pnpm gen view Reports --group user [--path /reports] [--feature reports] [--nav] [--eager]
pnpm gen view Pricing --group guest               # a public page
```

This creates `src/views/<group>/<Page>/index.tsx` (signed-in pages compose
`UserPageLayout`, which renders the page `h1`; public pages own their `main`
and `h1`), adds the path to `src/globals/paths.ts`, registers the route in
`src/views/<group>/index.tsx` (lazy unless `--eager`), adds its copy to
every locale and a test that renders it through the real router. Options:

- `--feature <name>` renders the generated feature's panel (`<Name>Panel`);
  otherwise compose features' public components by hand.
- `--nav` links it from the signed-in navigation.
- `--path` defaults to the kebab-cased name.

By hand, the same steps are: path in `paths.ts` (never hard-code paths in
views), view folder, route entry
(`{ path: paths.x, lazy: () => import('./X').then(({ X }) => ({ Component: X })) }`),
copy, test.

Then:

- Link to it with `LinkBase to={paths.x}`.
- Page state that should be shareable (filters, tabs) belongs in the URL:
  `useSearchParams` in the page's `logic.ts`, updated with `replace`
  ([routing](../routing.md#route-definitions)).
- To keep a heavy page out of the initial bundle for good, add its module to
  `LAZY_MODULES` in `scripts/check-build.mjs`.
- Deep links into protected pages from the guest group land on sign-in with
  `returnTo`, and on the page after sign-in (and after required onboarding).

Which group: `user` for signed-in pages, `guest` for public ones; the
`onboarding` group holds the required onboarding flow only. Multi-step
journeys go under `/flow/<flow>/<step>`: `pnpm gen flow`
([flows.md](../flows.md)). Group selection, unknown paths and `returnTo`:
[routing.md](../routing.md).
