import { useCallback } from 'react';

import { useI18n } from 'i18n/provider';

import { getFormErrorKey } from './messages';

/**
 * Turns a field error (whose `message` is an error code) into localized text
 * for Field/Checkbox/RadioGroup `error` props.
 */
export const useFieldErrorMessage = () => {
  const { t } = useI18n();
  return useCallback(
    (error: { message?: string | undefined } | undefined) =>
      error?.message ? t(getFormErrorKey(error.message)) : undefined,
    [t],
  );
};
