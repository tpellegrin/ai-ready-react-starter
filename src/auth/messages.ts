import { getErrorMessageKey } from 'api/http';
import type { I18nKey } from 'i18n';

import { isAuthError } from './types';

/**
 * Any error from an auth operation → i18n key, so views never show a raw
 * `message`. Transport failures fall back to the data layer's mapping.
 */
export const getAuthErrorMessageKey = (error: unknown): I18nKey => {
  if (isAuthError(error, 'invalid_credentials')) return 'auth.signIn.error';
  if (isAuthError(error, 'unauthenticated')) return 'auth.session.expired';
  if (isAuthError(error, 'timeout')) return 'errors.api.timeout';
  return getErrorMessageKey(error);
};
