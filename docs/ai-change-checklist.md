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
- [ ] I used the React Query/API layer for all server data fetching.
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
- [ ] I added or updated unit tests to cover the new logic.
- [ ] I ran the full validation suite using `pnpm validate`.
- [ ] I fixed all failures (linting, types, tests) caused by my changes.
- [ ] I reported any remaining pre-existing failures honestly.
- [ ] I ensured the application still builds and runs correctly.
