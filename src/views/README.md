# Views Folder

## Purpose
Views compose routes, flows, components, data, and copy into high-level pages. This is where most app-specific features are implemented.

## Rules
- **State-Based Separation**: Organize views into `guest`, `onboarding`, and `user` subfolders based on the routing model.
- **Composition**: Compose views using primitives from `src/components/`.
- **Styles**: Export styled components from a local `styles.ts` using the `_ViewNameElementName` naming convention. For specialized layout behavior (e.g. hero image placement, floating cards), create local styled components here instead of introducing broad global abstractions.
- **Logic**: For views with meaningful business or control logic (forms, complex state, navigation decisions), colocate that logic in a `logic.ts` hook file.
- **i18n**: Ensure all text in views is externalized.

## Avoid
- **Raw Fetching**: Use React Query and the API layer instead of `fetch` or `axios` directly in views.
- **Leaking Logic**: If a part of a view is reusable, extract it into a component in `src/components/`.

## Extension guidance
To add a new page, create a folder under the appropriate router type and define its routes in the corresponding `index.tsx` file.
