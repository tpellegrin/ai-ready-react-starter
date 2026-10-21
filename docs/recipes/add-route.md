# Recipe: add a page or route

1. Add the path to `src/globals/paths.ts` (in the right group object).
2. Create the view in `src/views/<group>/<Name>/index.tsx` (signed-in pages
   compose `UserPageLayout`, which renders the page `h1`).
3. Register it in `src/views/<group>/index.tsx`:
   - `{ path: paths.x, Component: X }`, or
   - `{ path: paths.x, lazy: () => import('./X').then(({ X }) => ({ Component: X })) }`
     for pages with heavy dependencies. To keep it out of the initial bundle
     for good, add its module to `LAZY_MODULES` in `scripts/check-build.mjs`.
4. Link to it with `LinkBase to={paths.x}` (and from navigation if needed).
5. Test it with `renderApp({ routes, initialPath })`; deep links into
   protected pages from the guest group should land on sign-in with
   `returnTo`.

Multi-step flows go under `/flow/<flow>/<step>` and follow
[flows.md](../flows.md). Group selection, unknown paths and `returnTo` are
described in [routing.md](../routing.md).
