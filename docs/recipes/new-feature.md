# Recipe: add a feature

A feature is a folder under `src/features/<name>` with one public entry
(`index.ts`); everything a product capability needs lives inside it. Rules:
[boundaries](../architecture/boundaries.md#features). In an adopted product,
name it in the product's language (`invoices`, `appointments`) — domain
terms belong here.

## 1. Scaffold

```bash
pnpm gen feature invoices --entity Invoice --dry-run   # review the plan
pnpm gen feature invoices --entity Invoice
```

This creates the model (Zod schema), the endpoint call, feature-owned query
keys, a panel with loading/error/empty/success states (`index.tsx` +
`logic.ts`), MSW handlers and fixtures, and a test; adds the copy to every
locale; and registers the handlers in `src/mocks/handlers.ts`. It refuses
invalid names and existing features and never overwrites files.

## 2. Make it real

1. Replace the sample schema in `model.ts` with the real response contract.
2. Point `api.ts` at the real endpoint; every call passes a schema and the
   query's `AbortSignal` ([data-and-forms](data-and-forms.md)).
3. Add mutations in `queries.ts`: `useMutation` that invalidates the
   feature's keys and resolves once the list is fresh
   ([data-and-forms](data-and-forms.md#mutations)).
4. Build components under `components/` — `pnpm gen component <Name>
--feature invoices [--logic]` — composing shared building blocks
   (`pnpm catalog`); state and handlers in `logic.ts`.
5. Forms: React Hook Form + Zod error codes + `Field`; server 422s with
   `applyServerFieldErrors` ([data-and-forms](data-and-forms.md#forms)).
6. Update the fixtures and handlers in `mocks/`, including error cases
   (`consumeFault('<feature>.<action>')` makes the next call fail with a 500)
   and a 422 with field codes for validation.
7. Translate the copy in every locale (`pnpm i18n:check` lists gaps).

## 3. Expose it

Export what views need from `index.ts` (explicit names only), then put it on
a page:

```bash
pnpm gen view Invoices --group user --feature invoices --nav
```

That adds `paths.invoices`, a lazy route, a navigation link and a page that
renders `InvoicesPanel`. Pages compose features; features never import each
other ([boundaries](../architecture/boundaries.md#features)).

## 4. Verify

Tests next to the code (the generated ones are a start: add the mutation's
success, 422 and failure paths), a story for meaningful shared UI, then
`pnpm validate` — and `pnpm verify` before merging.

<!-- starter:reference-start -->

## Reference

`src/features/resources` is the complete example: list with URL filter,
create/edit dialog with client and server validation, delete confirmation,
toasts and locale-aware formatting (`useSaveResource`, `ResourceForm`,
`ResourceCatalog`). It is removed by `pnpm adopt --remove-reference`.

<!-- starter:reference-end -->
