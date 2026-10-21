# How to Extend This Boilerplate

This guide explains how to add common features while preserving the boilerplate's architecture.

## Add a new flow

For a complete guide, see [`docs/flows.md`](./flows.md). The short version:

1. Add step paths under `flowPaths` in `src/globals/paths.ts` (key order = step order). Ensure the key in `flowPaths` matches the flow segment in the URL (e.g., key `my-flow` for `/flow/my-flow/...`).
2. Create screen components in `src/views/<routerType>/<FlowName>/` that compose `FlowLayout`.
3. Use `useFlowNav` for `goNext()` / `goBack()` and `useFlowProgressFromPaths` for progress.
4. Register routes in the appropriate `src/views/<routerType>/index.tsx` — the `/flow/` prefix is enough to enable slide transitions.
5. Add i18n keys and run `pnpm i18n:check`.
6. Add tests for routing and completion behavior.
7. Run `pnpm validate`.

Study `src/views/onboarding/` as the canonical reference before building a new flow.

## Add a new route

1. Identify the router type: `Guest`, `Onboarding`, or `User`.
2. Locate the corresponding file in `src/views/[type]/index.tsx`.
3. Add the route definition to the exported array.
   ```typescript
   { path: '/new-route', Component: NewView }
   ```
4. If it's a "flow" route, use the `/flow/` prefix to enable center-transition animations.

## Add a new view

1. Create a folder in `src/views/[type]/[ViewName]`.
2. Create a `logic.ts` file for component-specific hooks, derived state, and handlers if the view has meaningful logic.
3. Create a `styles.ts` file for styled components using the `_ViewNameElementName` naming convention.
   - For specialized layout needs (e.g. hero headers, floating cards), create local styled components in this file instead of introducing broad global layout abstractions.
4. Implement the view component in `index.tsx`, using the hook from `logic.ts` and local styles.
5. Export it from the folder's `index.tsx`.

## Add a reusable component

1. Place domain-neutral components in `src/components/`.
2. Follow the `index.tsx` + `logic.ts` (optional) + `styles.ts` + `types.ts` structure.
3. Use `logic.ts` to separate meaningful control logic (data fetching, search, filtering) from rendering.
4. Use `styled-components` for styling in `styles.ts`, using the `_ComponentNameElementName` naming convention and referencing `props.theme`.
5. Ensure it is accessible and supports i18n where applicable.

## Add a feature-specific component

1. If a component is specific to a single view or flow, place it within that view/flow folder.
2. If it's used across multiple views but is domain-specific, create a folder in `src/features/[FeatureName]/components`.

## Add a feature

Run `pnpm gen feature <name>` and follow
[recipes/new-feature.md](recipes/new-feature.md). Features live in
`src/features/<name>` and are imported only through their `index.ts`
([boundaries](architecture/boundaries.md)).

## Add an API call or mutation

1. Define the response schema in the feature's `model.ts` (Zod).
2. Call `apiClient.request({ path, schema, signal })` from the feature's
   `api.ts` — never `fetch`/`axios` in components.
3. Add keys, `queryOptions` and `useMutation` hooks (invalidating the
   feature's keys) in `queries.ts`.
4. Add MSW handlers and fixtures in the feature's `mocks/`.

Details: [recipes/data-and-forms.md](recipes/data-and-forms.md).

## Add a form

Use React Hook Form + Zod with `Field` and the `Form` primitives; schemas
return error codes, translated with `useFieldErrorMessage()`; server 422
errors go to fields with `applyServerFieldErrors`. See
[ui/foundation.md](ui/foundation.md#forms) and `ResourceForm`.

## Add auth behavior

1. Read auth state and actions through `useAuth()`.
2. Never touch tokens or auth storage outside an adapter (lint-enforced).
3. To change how authentication works, write an `AuthAdapter` and register it
   in the composition root ([recipe](recipes/real-auth-adapter.md)).

## Add theme tokens

1. Add new tokens to the base theme in `src/styles/themes/base.ts`.
2. Ensure they are available in the `DefaultTheme` interface if using TypeScript.

## Add translations

1. Add keys to `src/i18n/locales/[lang].json`.
2. Use the `useI18n` hook to access them.
3. Run `pnpm i18n:check` to ensure all languages are in sync.

## Add tests

1. Create a `[FileName].test.tsx` file next to your component or utility.
2. Use Vitest and React Testing Library with `renderWithProviders` or
   `renderApp` (`src/test`); data flows through MSW handlers.
3. Add a story (`[Name].stories.tsx`) with a play function for UI states.
4. Run `pnpm test:run` (and `pnpm test:storybook` for stories).

## Add environment variables

Follow [configuration.md](configuration.md#adding-a-variable): add the
variable to the Zod schema, `src/vite-env.d.ts`, `.env.example` and the
committed `.env.*` files, and read it through `src/config` (reading
`import.meta.env` elsewhere is a lint error). `VITE_*` values are public.

## Add dependencies

1. Only add dependencies if they solve a problem that existing libraries cannot.
2. Favor lightweight, well-maintained libraries.
3. Record the reason (and what existing dependencies could not do) in the PR
   and, for architectural libraries, in an ADR.
4. Production dependencies must pass `pnpm audit --prod` ([SECURITY.md](../SECURITY.md)).
