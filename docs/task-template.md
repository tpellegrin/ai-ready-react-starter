# Task template

Copy this into an issue, a PR description or an AI agent prompt. Short and
specific beats long and vague.

```md
## Goal

<one or two sentences: the user-visible outcome>

## Context

- Feature/area: <src/features/... or view>
- Related docs: <docs/routing.md, docs/recipes/..., ADR>
- Constraints: <must keep X; must not add dependencies; copy in all locales>
- References (optional): <design/<task>/references/\*.png, with their roles; follow docs/recipes/compose-from-images.md>

## Acceptance

- [ ] <behavior 1, including the failure/empty/loading case>
- [ ] <behavior 2>
- [ ] Accessible: labels, keyboard path, focus after the action
- [ ] Tests: <unit/integration/story/e2e that prove it>

## Out of scope

- <what not to touch>

## Verification

- [ ] `pnpm validate` (and `pnpm verify` for routing, session or UI behavior)
- [ ] Scaffolded with `pnpm gen …` where it applies; checked `pnpm catalog` before adding components
- [ ] Docs updated if a pattern changed
```

For agents: read `AGENTS.md` first (check the mode: starter or product),
follow the closest recipe in `docs/recipes/README.md`, and report exactly
which commands ran and their results.
