# UI foundation

A small set of domain-neutral primitives in `src/components/`, styled with
theme tokens (`src/styles/themes`). Every interactive primitive has stories
with interaction and axe checks (`pnpm test:storybook`); browse them with
`pnpm storybook`. Primitives receive data through props — they never fetch
(lint-enforced).

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
during render from the query (see
`features/resources/components/ResourceCatalog/logic.ts`); do not mirror it
into component state.

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

`features/resources/components/ResourceForm` is the complete example
(client and server validation, numeric input, radio group, checkbox).

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

## Adding a primitive

Only when two features need it and no existing primitive fits. Put it in
`src/components/<Name>/` (`index.tsx`, `styles.ts`, `types.ts`, plus
`logic.ts` if it has meaningful logic), keep it domain-neutral, use theme
tokens, add a story with a play function, and a unit test for any logic.
