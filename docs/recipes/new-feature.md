# Recipe: add a feature

A feature is a folder under `src/features/<name>` with one public entry
(`index.ts`). See [boundaries](../architecture/boundaries.md#features) for the
rules and `src/features/resources` for the complete reference.

## 1. Scaffold

```bash
pnpm gen feature notes --dry-run   # review the plan
pnpm gen feature notes             # entity name derived (Note); override with --entity
```

This creates the model (Zod schema), the endpoint call, feature-owned query
keys, a panel with loading/error/empty/success states (`index.tsx` +
`logic.ts`), MSW handlers and fixtures, and a test; adds the copy to every
locale; and registers the handlers in `src/mocks/handlers.ts`. It refuses
invalid names, paths and existing features, and never overwrites files.

## 2. Make it real

1. Replace the sample schema in `model.ts` with the real response contract.
2. Point `api.ts` at the real endpoint (every call passes a schema and the
   query's `AbortSignal`).
3. Add mutations in `queries.ts` (`useMutation` that invalidates the
   feature's keys; see `useSaveResource`).
4. Build components under `components/`, keeping state and handlers in
   `logic.ts`. Use the primitives in [ui/foundation](../ui/foundation.md).
5. Update the fixtures and handlers in `mocks/` to match, including error
   cases (`consumeFault('<feature>.<action>')` makes the next call fail).
6. Translate the new copy in every locale (`pnpm i18n:check` lists gaps).

## 3. Expose it

Export what views need from `index.ts`, then render it from a view and add a
route (see [add-route](add-route.md)). Use `lazy` if it pulls in forms or
dialogs.

## 4. Verify

Unit/integration tests next to the code (the generated test is a start), a
story for meaningful UI states, then `pnpm validate`.
