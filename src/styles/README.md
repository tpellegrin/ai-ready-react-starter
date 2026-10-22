# Styles Folder

## Purpose

This folder owns the styling system, including themes, design tokens, global styles, and responsive design helpers.

## Rules

- **Theme Tokens**: All visual constants must be defined in the theme (e.g., `src/styles/themes/base.ts`).
- **Media Queries**: Use the `from` and `until` helpers in `src/styles/media.ts` for responsiveness.
- **Import Convention**: Components use direct named imports for local styles from `./styles`; no namespace imports (lint-enforced).
- **Naming Convention**: Internal styled components start with `_` and the owning component name (e.g., `_ButtonRoot`); they never leave their folder (lint-enforced).
- **Theme values**: Colors only from the theme (no hex, named or rgb/hsl colors — Stylelint and ESLint); spacing, typography and radii from tokens too (review). Structural sizes such as `max-width: 40rem` are fine.
- **Motion**: Never `transition: all`; animated elements opt in with `data-allow-*` and respect reduced motion (lint-enforced where syntax allows, e2e-checked).

## Avoid

- **Parallel Systems**: No other styling systems or stylesheet imports (Tailwind, CSS Modules, Emotion — lint-enforced); change that only through an ADR.
- **Specific Component Styles**: Styles specific to a single component should live in that component's file or folder, not here.

## Extension guidance

To add a new color, spacing value, or font, update the base theme in `src/styles/themes/base.ts`.
