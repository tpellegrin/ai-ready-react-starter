# 0005 — Styling and Theme System

## Status
Accepted

## Decision
Styling is implemented using `styled-components` with a design-token-based theme system.

## Why
`styled-components` provides scoped styling and tight integration with TypeScript. Using a central theme for design tokens ensures visual consistency and makes it easy to support multiple themes (e.g., Light/Dark mode).

## Consequences
- No CSS files (except for global resets if necessary).
- Use `props.theme` for all visual constants (colors, spacing, etc.).
- Avoid hardcoding values in `styled` declarations.

## Change guidance
Add or modify tokens in `src/styles/themes/base.ts`. Ensure new tokens are added to all theme variations.
