# Styles Folder

## Purpose
This folder owns the styling system, including themes, design tokens, global styles, and responsive design helpers.

## Rules
- **Theme Tokens**: All visual constants must be defined in the theme (e.g., `src/styles/themes/base.ts`).
- **Media Queries**: Use the `from` and `until` helpers in `src/styles/media.ts` for responsiveness.
- **No Hardcoded Values**: Avoid using raw CSS values in components; always reference the theme.

## Avoid
- **Parallel Systems**: Do not introduce other styling systems (Tailwind, CSS Modules) unless explicitly approved.
- **Specific Component Styles**: Styles specific to a single component should live in that component's file or folder, not here.

## Extension guidance
To add a new color, spacing value, or font, update the base theme in `src/styles/themes/base.ts`.
