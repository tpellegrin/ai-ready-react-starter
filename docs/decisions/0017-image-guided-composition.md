# 0017 — Image-guided composition

## Status

Accepted (2026-10)

## Decision

Agents build pages and flows from screenshots, wireframes or sketches with
one workflow ([recipe](../recipes/compose-from-images.md)):
reference → interpretation → component mapping → implementation → browser
evidence → focused correction.

- **The agent interprets; scripts establish facts.** A vision-capable
  agent reads the images and writes a small, versioned composition plan
  (`design/<task>/plan.json`) and normal React code. `pnpm design`
  (`scripts/design.mjs`, `scripts/lib/design/`) only does what is
  deterministic: copying references and recording their format, size and
  hash (`init`), validating the plan read-only (`check`), rendering capture
  scenarios and reporting (`capture`), and comparing reviewed baselines
  (`regress`).
- **The plan is a task artifact, not a source of code.** It records
  references and their roles, screens, states and regions, component
  mappings to real public exports (resolved with the catalog's library,
  `scripts/lib/catalog.mjs` — no second registry), interactions,
  responsive behavior (observed or assumed), questions, assumptions,
  deviations, acceptance criteria, capture scenarios and the correction
  log. Each item says what it rests on; there are no confidence scores.
  Nothing in it is executed.
- **Evidence is reproducible and separate from approval.** Captures use a
  fresh production build, declared API responses, explicit readiness and
  recorded environment, and reuse the e2e fixtures (session fake, motion
  settling, axe). Reports keep mechanical results, agent observations and
  human review apart.
- **Captures keep the requested viewport.** Content below the fold is
  reached by scrolling the page's scroll container (screenshots at
  successive positions, reported as incomplete when the end is not
  reached), never by growing the viewport to the content height, which
  changes `vh` units, height media queries and sticky elements. A capture
  passes only when Playwright's test passed too (console errors and
  failures after the screenshot count).
- **Writes stay where they belong.** `init` writes only under
  `design/<task>/`, captures under `reports/design/` and baseline updates
  under `design/<task>/baselines/`; every destination is checked before
  the first write, and no path through a symbolic link is written.
- **Two comparisons, kept apart.** Design comparison (render vs reference)
  is structural: presence, arrangement and containment of regions, with
  sizes as measurements. Visual regression (render vs reviewed baseline)
  uses Playwright snapshots at default thresholds; baselines are written
  only on request and missing ones fail.
- **Proof in an adopted product.** `pnpm adopt:check --scenario design`
  replays two demonstrations from fixtures (`scripts/adoption/design`) after
  both starter groups are removed, with hash-checked overlays on generated
  code, and runs the adopted project's verify.

## Why

Agents given a picture tend to either rebuild what the foundation already
has or copy coordinates and colors, and nothing records what was assumed or
changed. A plan that names verified exports and documented deviations,
plus evidence a reviewer can open, keeps the work inside the architecture
and honest about differences.

Alternatives considered:

- **A runtime layout interpreter or a layout DSL** turning plans into UI:
  a second way to write the application, harder to review than code, and
  it would drift from the components' real APIs.
- **Image understanding in scripts (a model API or a vision service):**
  a hosted dependency, an account and nondeterministic CI; the agent
  already sees the images.
- **Pixel-diff scores against references:** sketches have no pixels to
  match and high-fidelity mocks use another design system; an uncalibrated
  percentage reads as approval. Structure plus images for people is honest.
- **A separate component registry for mapping:** duplicates `pnpm catalog`,
  which already reports facts from the source.
- **Figma or design-tool integration:** an external account and API; PNG
  and JPEG cover every source for a first version.

## Consequences

- New: `pnpm design` and its two verify steps (`design`, in `pnpm
validate`; `design-regression`, in CI's e2e job), `--affected` rules for
  `design/`, a build check that nothing from `design/` or `reports/` ships,
  the catalog's library and page shells (`src/views/<group>/common`) in
  `pnpm catalog`, and an adoption scenario.
- Capture runs build the app (tens of seconds) and need Playwright
  browsers. Baselines are per platform: Linux CI needs Linux baselines.
- The plan format is versioned (`schemaVersion`); tools refuse versions
  they do not know.
- Interpretation quality is not machine-checked: the demonstrations prove
  the tooling and two pages, not every future image.

## Change guidance

Extend the plan only with fields a check or the report uses, and bump
`schemaVersion` for incompatible changes. Keep capture scenarios
declarative (no scripts in plans). Add comparison rules as pure functions
in `scripts/lib/design/geometry.mjs` with tests. Update the recipe, the
demonstration fixtures (their overlay hashes fail when templates change)
and this record together.
