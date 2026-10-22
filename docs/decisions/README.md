# Architecture decisions

Short records of why the architecture is the way it is. Read the relevant
one before changing a system; amend it (or add a new one) when you change
it.

| ADR                                                | Decision                                                        |
| -------------------------------------------------- | --------------------------------------------------------------- |
| [0001](0001-app-shell-and-providers.md)            | App shell, provider order, dependencies injected as props       |
| [0002](0002-routing-model.md)                      | Route groups by session state; destinations across group swaps  |
| [0003](0003-auth-adapter-boundary.md)              | Auth adapter contract; provider-owned session and its lifecycle |
| [0004](0004-query-api-layer.md)                    | TanStack Query (amended by 0011)                                |
| [0005](0005-styling-and-theme-system.md)           | styled-components with theme tokens                             |
| [0006](0006-animation-system.md)                   | Route and flow transitions, reveals, reduced motion             |
| [0007](0007-i18n-system.md)                        | Typed keys, every locale, pseudo-locale                         |
| [0008](0008-validation-and-ci.md)                  | `pnpm validate`/`verify` and CI                                 |
| [0009](0009-tooling-baseline.md)                   | Toolchain, strict types, dependency rationale                   |
| [0010](0010-configuration-and-composition-root.md) | Validated configuration, composition root, build flags          |
| [0011](0011-http-client-and-server-state.md)       | HTTP client, schemas, timeouts, feature-owned server state      |
| [0012](0012-forms-and-validation.md)               | React Hook Form + Zod + `Field`                                 |
| [0013](0013-feature-modules-and-boundaries.md)     | Feature modules and enforced import boundaries                  |
| [0014](0014-ui-foundation.md)                      | Small UI foundation; public components and internal elements    |
| [0015](0015-testing-strategy.md)                   | Test layers and browsers                                        |
| [0016](0016-starter-adoption.md)                   | Adoption, provenance, generators                                |
| [0017](0017-image-guided-composition.md)           | Pages from images: plans, checks, captures, baselines           |

## Changing the architecture

Routine feature work needs no ADR. When a change alters how a system works
or what it guarantees:

1. **Look for the existing extension point** — the recipes
   (`docs/recipes/README.md`), `pnpm catalog`, the ADR for that system.
2. **Say why it does not fit**, concretely (what breaks, what it cannot
   express).
3. **Make the smallest coherent change**, and update what enforces it in
   the same change: lint rule and fixture (`scripts/architecture/fixtures`),
   generator templates, tests, budgets or floors (with the reason).
4. **Record it**: amend the system's ADR with a dated `## Amendment`
   section, or add `NNNN-short-title.md` for a new decision using the
   template below; update the docs it affects.
5. **State the tradeoff** in the pull request: what gets better, what it
   costs, what is no longer guaranteed.

```md
# NNNN — Title

## Status

Accepted (YYYY-MM)

## Decision

What we do now.

## Why

The problem, and why the existing options did not fit.

## Consequences

What changes for code, checks and people (including what got harder).

## Change guidance

How to extend or revisit it.
```
