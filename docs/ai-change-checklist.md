# AI Change Checklist

Use this checklist before, during, and after making changes to the boilerplate to ensure architectural integrity.

## Before editing

- [ ] I inspected nearby files and identified the existing implementation patterns.
- [ ] I determined if this change belongs to infrastructure (generic) or example code (domain-specific/replaceable).
- [ ] I checked whether an existing primitive, helper, or provider already solves this problem.
- [ ] I confirmed that the change is generic and doesn't introduce product-specific business logic.
- [ ] I verified that no unnecessary dependencies are being added.
- [ ] I avoided creating a parallel architecture for something that already exists.

## While editing

- [ ] I used the correct folder conventions (e.g., primitives in `src/components`, views in `src/views`).
- [ ] I used theme tokens (`props.theme`) instead of hardcoded visual values.
- [ ] I kept all user-facing copy i18n-ready using the translation system.
- [ ] I respected the auth boundary by using `useAuth` instead of direct storage access.
- [ ] I ensured new flows conform to the `paths.flow` contract (keys matching URL segments) instead of modifying shared infrastructure.
- [ ] Server data goes through `apiClient` (with a response schema) and feature-owned TanStack Query hooks.
- [ ] New product code lives in a feature (`pnpm gen feature`) and is imported through its `index.ts`.
- [ ] Configuration is read through `src/config`; no secrets in `VITE_*`.
- [ ] I followed the styled-components naming convention:
  - Direct named imports from `./styles` (no namespace imports).
  - Internal styled components start with `_` and include the component name.
  - Styled components live in a separate `styles.ts` or `styles.tsx` file.
- [ ] I separated meaningful control logic into a colocated `logic.ts` file.
- [ ] I kept shared components domain-neutral and reusable.
- [ ] I ensured that any demo or example code remains easily replaceable.
- [ ] I avoided broad global layout abstractions for feature-specific layout problems.

## After editing

- [ ] I updated the documentation if I changed or added an architectural pattern.
- [ ] I added or updated tests; a bug fix has a test that fails without the fix.
- [ ] I ran `pnpm validate` (and the relevant extra checks: `pnpm test:storybook`, `pnpm test:e2e`, `pnpm check:build`, or `pnpm verify`).
- [ ] I did not weaken any guardrail (thresholds, budgets, lint rules, skipped tests).
- [ ] I fixed all failures (linting, types, tests) caused by my changes.
- [ ] I reported any remaining pre-existing failures honestly.
- [ ] I ensured the application still builds and runs correctly.
