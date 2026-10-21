import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { getFieldErrors } from 'api/http';

/**
 * Applies a 422 validation response to React Hook Form fields and focuses the
 * first invalid one. Returns false when the error has no field errors for
 * these fields, so the caller can show a form-level message instead.
 */
export const applyServerFieldErrors = <TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: readonly Path<TValues>[],
): boolean => {
  const fieldErrors = getFieldErrors(error);
  if (!fieldErrors) return false;

  let applied = false;
  for (const field of fields) {
    const [code] = fieldErrors[field] ?? [];
    if (!code) continue;
    setError(
      field,
      { type: 'server', message: code },
      { shouldFocus: !applied },
    );
    applied = true;
  }
  return applied;
};
