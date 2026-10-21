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

## Acceptance

- [ ] <behavior 1, including the failure/empty/loading case>
- [ ] <behavior 2>
- [ ] Accessible: labels, keyboard path, focus after the action
- [ ] Tests: <unit/integration/story/e2e that prove it>

## Out of scope

- <what not to touch>

## Verification

- [ ] `pnpm validate`
- [ ] <extra: pnpm test:storybook / pnpm test:e2e / pnpm check:build>
- [ ] Docs updated if a pattern changed
```

For agents: read `AGENTS.md` first, follow the closest recipe in
`docs/recipes/`, and report exactly which commands ran and their results.
