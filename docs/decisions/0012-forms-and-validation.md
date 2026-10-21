# 0012 — Forms: React Hook Form, Zod and Field composition

## Status

Accepted (2026-10)

## Decision

- Forms use React Hook Form with `zodResolver`; schemas return **error codes**
  that the UI translates at render time (`src/forms/messages.ts`).
- `Field` composes label, description, error and ARIA wiring around any
  native control; `Checkbox` and `RadioGroup` cover choices.
- Server validation (422 with field codes) is applied to fields with
  `applyServerFieldErrors`, which focuses the first invalid field; other
  failures become a form-level alert.
- Numeric inputs report `number | null` through `onValueChange` (used with a
  `Controller`), never synthetic change events.

## Why

Placeholder-labelled inputs and ad-hoc state did not scale to field errors,
server errors, focus management and locale-aware messages.

## Consequences

- Messages follow the active locale without re-validating.
- Any control can join a form through `Field` without new wrappers.

## Change guidance

Use `features/resources/components/ResourceForm` as the template. Add new
codes to `FORM_ERROR_KEYS` with copy in every locale.
