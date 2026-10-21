# Components Folder

## Purpose

This folder contains shared, domain-neutral UI primitives and components. These are the building blocks used to construct views and flows.

## Rules

- **Domain-Neutral**: Components here must not know about specific product logic or entities.
- **Theme-Based**: Always use theme tokens (`props.theme`) for styling.
- **Composition**: Favor small, composable components over large, complex ones.
- **Logic Separation**: For components with meaningful internal logic (state management, filtering, etc.), use a colocated `logic.ts` file to keep the UI clean.

## Avoid

- **Feature-Specific Logic**: If a component is only used in one feature, it probably doesn't belong here.
- **Data Fetching**: Components here should receive data via props, not fetch it themselves.

## Extension guidance

When adding a new component, check if a similar one already exists. If it's a new primitive, ensure it's generic enough to be reused across different parts of the app.
