# UI foundation

A small set of opinionated, domain-neutral building blocks in
`src/components/` (plus the layouts in `src/containers/Layouts`), styled with
theme tokens (`src/styles/themes`). Applications are composed from them.
Interactive components have stories with interaction and axe checks in
Chromium and WebKit (`pnpm test:storybook`); browse them with
`pnpm storybook`, or list the public APIs with `pnpm catalog`. Building
blocks receive data through props — they never fetch (lint-enforced).

## Public components and internals

There are two levels, and the `_` prefix tells them apart at a glance:

| Level                       | Example                                               | Where                              | Who uses it                                                          |
| --------------------------- | ----------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| **Public component**        | `Button`, `Text`, `Field`, `MainLayout`, `ButtonBase` | the component folder's `index.tsx` | anyone: `import { Button } from 'components/Button'`                 |
| **Internal styled element** | `_ButtonRoot`, `_ButtonLabel`                         | that folder's `styles.ts`          | only the owning component (`import { _ButtonRoot } from './styles'`) |

Rules (enforced: `pnpm lint`, fixtures in `pnpm arch:check`):

- A component folder's **index is its public API**. Export there,
  explicitly, what other code may use — components, their prop types
  (`export type { BoxProps }`), and deliberate shared pieces (the dialog
  family exports `useReturnFocus` and its surface styles for
  `ConfirmDialog`). Everything else in the folder is private: `styles.ts`,
  `logic.ts`, helpers, `types.ts`.
- **Internal styled elements** are named `_<Component><Part>` after the
  folder (`_ButtonRoot` in `Button/styles.ts`), live in `styles.ts`, and are
  imported by name from `./styles` — never as a namespace, never from
  another folder, never re-exported. A `_` element that others need should
  become a public component with its own folder.
- **Compose, don't reach in.** To change how another component looks in
  your context, extend its public component (`styled(Text)` as
  `_ButtonLabel` in your own `styles.ts`) or use its props — do not target
  its internals.
- **Local wrappers are fine** for structure or layout that existing
  components do not express: a `_<YourComponent>Grid` in your own
  `styles.ts`, on theme tokens. Do not rebuild existing controls (buttons,
  fields, dialogs) — you would lose their accessibility, states and
  behavior.

Before adding a building block: `pnpm catalog <name or prop>` lists what
exists (props, stories, usages). See [Adding a building
block](#adding-a-building-block).

## Inventory

| Need                     | Use                                         | Notes                                                                                                                                |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Text and headings        | `Text`                                      | `as` (p, span, div, h1–h6, …), `variant` (typography token), `color`. Omit both to inherit.                                          |
| Layout                   | `Flex`, or a local styled component         | `Box` is a **visible surface** (border, background), not a layout div.                                                               |
| Card surface             | `CardBase`                                  | `Box` with card radius/padding.                                                                                                      |
| Actions                  | `Button`, `LinkBase`                        | `Button`: `label`, `variant`, `startIcon`/`endIcon` (decorative), `isPending` + `pendingLabel`. `LinkBase`: `to` (in-app) or `href`. |
| Form fields              | `Field` + `Input` / `Select` / `Textarea`   | `Field` owns label, description, error and ARIA wiring.                                                                              |
| Choices                  | `Checkbox`, `RadioGroup`                    | Native inputs, visible labels, descriptions via `aria-describedby`.                                                                  |
| Numbers                  | `Input format="number"` (or `"currency"`)   | Locale-aware grouping; reports `number \| null` through `onValueChange`.                                                             |
| Modal task               | `Dialog`                                    | Controlled (`open`), focus moves in and returns to the opener (or `fallbackFocus`).                                                  |
| Destructive confirmation | `ConfirmDialog`                             | Focus starts on Cancel; `isPending` blocks dismissal; `error` stays inline.                                                          |
| Transient confirmation   | `useToast().showToast({ title })`           | Polite live region (errors assertive). Never the only place an error appears.                                                        |
| Inline message           | `InlineAlert`                               | `tone`: info/success/warning use `role="status"`, error uses `role="alert"`.                                                         |
| Loading                  | `LoadingState` (+ `Skeleton` to hold space) | `LoadingState` is a polite status; `Skeleton` is hidden from assistive technology.                                                   |
| Nothing to show          | `EmptyState`                                | Title, description and the next action.                                                                                              |
| Failed load              | `ErrorState`                                | Alert with a "Try again" action (`onRetry`, `isRetrying`).                                                                           |
| Progress                 | `Progress`                                  | `label` is required (a progressbar needs a name).                                                                                    |
| Language                 | `LanguageSelector`                          | Labelled native select.                                                                                                              |

## Data-driven regions: four states

Every region that loads data renders exactly one of: **loading**
(`LoadingState`, optionally `Skeleton`), **error** (`ErrorState` with retry),
**empty** (`EmptyState` with a next step) or **content**. Derive the state
during render from the query (see the `logic.ts` of any generated
`<Feature>Panel`); do not mirror it into component state.

## Forms

React Hook Form + Zod, with fields composed through `Field`:

```tsx
<Field
  label={t('items.form.name')}
  description={t('items.form.nameHint')}
  error={fieldError(errors.name)}
  required
>
  {(control) => <Input {...control} {...form.register('name')} />}
</Field>
```

- Schemas return **error codes** (`'required'`, `'tooLong'`, `'taken'`);
  `useFieldErrorMessage()` translates them at render time, so messages follow
  the active locale (`src/forms/messages.ts`).
- Server validation (HTTP 422 `{ errors: { field: ['code'] } }`) goes next to
  the fields with `applyServerFieldErrors`, which also focuses the first one;
  anything else becomes a form-level `InlineAlert`.
- Numeric fields: use a `Controller` and pass `onValueChange={field.onChange}`
  (`number | null`; `null` means empty, never `0`). Decimals can be typed
  character by character; the display settles on blur.
- Validate on submit, focus the first invalid field, keep `Button isPending`
  focusable while saving, and never clear user input on failure.

`src/views/guest/SignIn` is the minimal example (schema, `logic.ts`,
form-level errors).

<!-- starter:reference-start -->

`ResourceForm` in the reference feature is the complete one (client and
server validation, numeric input, radio group, checkbox).

<!-- starter:reference-end -->

## Accessibility rules

- Every control has a visible label (`Field`, `Checkbox`, `RadioGroup`
  legend). Placeholder text is not a label.
- Icon-only buttons need `aria-label`; icons inside `Button` are decorative.
- Pages have one `main` landmark and one `h1`; headings do not skip levels.
- Focus: dialogs trap and return focus; deleting the element that opened a
  dialog moves focus to a sensible next action (`fallbackFocus`).
- Motion respects `prefers-reduced-motion` (durations clamp to ≤100 ms;
  reveals and spinners stop moving).
- Colors come from theme tokens that meet contrast requirements; the
  `feedback` tokens exist for error/success/warning text.

These are checked by axe in story tests and e2e tests; the rest (focus
order, announcements) is covered by interaction tests.

## Adding a building block

Only when the need is real and nothing fits: check `pnpm catalog`, the
inventory above, and whether a variant or composition of an existing
component would do. Then:

- **Shared** (used, or clearly reusable, across features):
  `pnpm gen component <Name>` → `src/components/<Name>` with `index.tsx`,
  `styles.ts` and a story with a play function (axe runs on it). Keep it
  domain-neutral.
- **For one feature:** `pnpm gen component <Name> --feature <name>` → inside
  the feature, with a unit test; it is exported from the feature's
  `index.ts` only if views need it.
- Add `--logic` when it has meaningful state, derived values or handlers
  (`logic.ts` + a unit test); simple presentational components have none.

The generator refuses a name that already exists in `src/components`.
