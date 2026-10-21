import type { I18nKey } from 'i18n';

/**
 * Validation error codes → i18n keys. Zod schemas and the API use these codes
 * (`z.string().min(1, 'required')`, 422 `{ errors: { name: ['taken'] } }`);
 * the UI translates them at render time, so messages follow the locale.
 */
export const FORM_ERROR_KEYS = {
  required: 'forms.errors.required',
  tooLong: 'forms.errors.tooLong',
  invalid: 'forms.errors.invalid',
  email: 'forms.errors.email',
  integer: 'forms.errors.integer',
  min: 'forms.errors.min',
  max: 'forms.errors.max',
  taken: 'forms.errors.taken',
} as const satisfies Record<string, I18nKey>;

export type FormErrorCode = keyof typeof FORM_ERROR_KEYS;

const isFormErrorCode = (code: string): code is FormErrorCode =>
  Object.hasOwn(FORM_ERROR_KEYS, code);

/** Unknown codes fall back to a generic "invalid value" message. */
export const getFormErrorKey = (code: string): I18nKey =>
  isFormErrorCode(code) ? FORM_ERROR_KEYS[code] : FORM_ERROR_KEYS.invalid;
