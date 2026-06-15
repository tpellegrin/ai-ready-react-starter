# What Not To Do

To maintain the quality and generic nature of this boilerplate, avoid the following common mistakes.

## Do not rewrite the architecture
Avoid replacing core systems like routing, auth, or styling unless there is a fundamental reason. Changes should aim to extend and improve the existing architecture, not parallel it or replace it with something incompatible.

## Do not add domain-specific boilerplate
Keep all examples and reusable code neutral.
- **Bad**: `CustomerBillingWorkflow`, `MarketplaceOrder`, `LoanApplication`, `RestaurantBooking`.
- **Good**: `ExampleResource`, `Profile`, `Settings`, `Item`, `Session`.

## Do not bypass auth boundaries
Never read tokens directly from local storage or cookies in your views. Always use the `useAuth` hook. This ensures that the authentication implementation can be swapped without breaking the UI.

## Do not bypass the query layer
Do not scatter raw `fetch` calls or `axios` instances across your components. All data fetching should be handled via React Query and the defined API layer.

## Do not hardcode visual values
Avoid using raw hex codes, pixel values for spacing, or literal font names in your components. Always use theme tokens via `props.theme`.
- **Bad**: `color: #ff0000;`, `margin: 10px;`
- **Good**: `color: ${(props) => props.theme.colors.error};`, `margin: ${(props) => props.theme.spacing.medium};`

## Do not create duplicate primitives
Before creating a new low-level component (like a Button or Input), check `src/components/` to see if a primitive already exists. If it does, extend it or use composition.

## Do not add dependencies casually
Every dependency adds weight and potential security risks. Before adding a new library, consider if the problem can be solved with existing tools or a small amount of custom code.

## Do not overengineer
Avoid building complex abstractions for simple problems.
- **No** plugin architecture for a single example.
- **No** global state library (Redux/Zustand) for state that can be handled locally or via React Query.
- **No** complex factory systems unless there is a clear, repeated need.
- **No** "future-proof" extension points that are not currently used.

## Do not mix complex logic with rendering
Avoid embedding substantial business or control logic directly in JSX components.
- **Bad**: Putting `useQuery`, complex `useMemo` filtering, and navigation handlers all inside a single `index.tsx` file.
- **Good**: Moving that logic into a colocated `logic.ts` hook and keeping `index.tsx` focused on the UI structure.

## Do not use namespace imports for styled components
Avoid `import * as _ from './styles'` or `import * as S from './styles'`. Direct named imports are preferred for better readability and grep-ability.
- **Bad**: `import * as _ from './styles'; <_._Container />`
- **Good**: `import { _ComponentNameRoot } from './styles'; <_ComponentNameRoot />`

## Do not bypass route guards
Never bypass route guards or provider boundaries.

## Do not modify shared flow infrastructure
Do not modify shared flow navigation infrastructure such as `fromPaths.ts` to make a new flow work. New flows must conform to the existing flow path contract, including `__order` and route registration. When a new flow fails in `goNext`/`goBack`, compare its path object and route registration with a working flow and fix the flow definition/caller first.

## Do not modify foundational baseline components
Avoid modifying foundational baseline layout components such as `BaseLayout` to solve feature-specific UI issues. `BaseLayout` must remain generic and stable because it supports multiple app regions and flow layouts. Prefer page-specific composition, feature layouts, wrapper components, or existing layout extension points. If a base component change appears necessary, first document why no safer local alternative exists and verify all dependent layouts.

## Do not use ambiguous internal names
Internal styled components must include the owning component name to avoid confusion and make global searches more effective.
- **Bad**: `export const _Root`, `export const _Container`, `export const _Wrapper`.
- **Good**: `export const _PriceActionBarRoot`, `export const _PriceActionBarContainer`.

## Do not let examples become product code
Example routes and components (like the Dashboard demo) are there to demonstrate how to use the boilerplate. They should remain neutral and easy to delete once the real project development begins.
