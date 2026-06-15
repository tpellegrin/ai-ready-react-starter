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

## Add an API call
1. Create a generic API function in `src/api/` (or `src/utils/` if following the demo pattern).
2. Use `fetch` or a library like `axios`.
3. Ensure it returns a Promise.

## Add a mutation
1. Use `useMutation` from `react-query`.
2. Define the mutation function in the API layer.
3. Handle `onSuccess` and `onError` to provide user feedback (e.g., via a progress bar or toast).

## Add a form
1. Use components from `src/components/Form`.
2. Use `LabeledInputField` for consistent styling.
3. Manage form state with a library or React `useState` for simple cases.
4. Ensure all labels are translated.

## Add auth behavior
1. Access auth state and methods via the `useAuth` hook.
2. Avoid direct manipulation of tokens or local storage.
3. If you need to change how authentication works, implement a new `AuthAdapter` in `src/auth/`.

## Add theme tokens
1. Add new tokens to the base theme in `src/styles/themes/base.ts`.
2. Ensure they are available in the `DefaultTheme` interface if using TypeScript.

## Add translations
1. Add keys to `src/i18n/locales/[lang].json`.
2. Use the `useI18n` hook to access them.
3. Run `pnpm i18n:check` to ensure all languages are in sync.

## Add tests
1. Create a `[FileName].test.tsx` file next to your component or utility.
2. Use Vitest and React Testing Library.
3. Run `pnpm test:run` to verify.

## Add environment variables
1. Add the variable to `.env.example` with a placeholder or description.
2. Update your `.env` file locally.
3. Reference it in code using `import.meta.env.VITE_VARIABLE_NAME`.

## Add dependencies
1. Only add dependencies if they solve a problem that existing libraries cannot.
2. Favor lightweight, well-maintained libraries.
3. Update `AGENTS.md` or `architecture.md` if the library introduces a new architectural pattern.
