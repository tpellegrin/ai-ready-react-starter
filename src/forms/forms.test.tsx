/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ApiError } from 'api/http';
import { I18nProvider } from 'i18n/provider';

import {
  applyServerFieldErrors,
  getFormErrorKey,
  useFieldErrorMessage,
} from './index';

const validationError = (errors: Record<string, string[]>) =>
  new ApiError({
    kind: 'http',
    method: 'POST',
    url: '/api/items',
    status: 422,
    body: { title: 'Validation failed', status: 422, errors },
  });

describe('applyServerFieldErrors', () => {
  it('sets each known field error from a 422 and focuses only the first', () => {
    const setError = vi.fn();
    const applied = applyServerFieldErrors(
      validationError({ name: ['taken'], quantity: ['max'], other: ['x'] }),
      setError,
      ['name', 'quantity'],
    );

    expect(applied).toBe(true);
    expect(setError).toHaveBeenNthCalledWith(
      1,
      'name',
      { type: 'server', message: 'taken' },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenNthCalledWith(
      2,
      'quantity',
      { type: 'server', message: 'max' },
      { shouldFocus: false },
    );
  });

  it('returns false for errors without usable field errors', () => {
    const setError = vi.fn();
    expect(applyServerFieldErrors(new Error('boom'), setError, ['name'])).toBe(
      false,
    );
    expect(
      applyServerFieldErrors(validationError({ other: ['taken'] }), setError, [
        'name',
      ]),
    ).toBe(false);
    expect(
      applyServerFieldErrors(
        new ApiError({ kind: 'http', method: 'POST', url: '/x', status: 500 }),
        setError,
        ['name'],
      ),
    ).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});

describe('form error messages', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider initialLocale="en-US">{children}</I18nProvider>
  );

  it('maps codes to keys and unknown codes to the generic message', () => {
    expect(getFormErrorKey('required')).toBe('forms.errors.required');
    expect(getFormErrorKey('toString')).toBe('forms.errors.invalid');
  });

  it('translates a field error code, and nothing for no error', () => {
    const { result } = renderHook(() => useFieldErrorMessage(), { wrapper });
    expect(result.current({ message: 'taken' })).toBe(
      'This is already in use.',
    );
    expect(result.current({ message: 'surprise' })).toBe(
      'Enter a valid value.',
    );
    expect(result.current(undefined)).toBeUndefined();
    expect(result.current({})).toBeUndefined();
  });
});
