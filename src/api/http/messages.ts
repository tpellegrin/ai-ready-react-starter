import type { I18nKey } from 'i18n';

import { isApiError } from './errors';

/**
 * Maps any error from the data layer to an i18n key, so non-React code never
 * produces user-facing text. Components render `t(getErrorMessageKey(error))`;
 * the raw `message` stays in logs/devtools.
 */
export const getErrorMessageKey = (error: unknown): I18nKey => {
  if (!isApiError(error)) return 'errors.generic.description';
  switch (error.kind) {
    case 'network':
      return 'errors.api.network';
    case 'aborted':
      return 'errors.api.aborted';
    case 'parse':
    case 'schema':
      return 'errors.api.unexpectedResponse';
    case 'http':
      break;
  }
  const status = error.status ?? 0;
  if (status === 401) return 'errors.api.unauthorized';
  if (status === 403) return 'errors.api.forbidden';
  if (status === 404) return 'errors.api.notFound';
  if (status === 409) return 'errors.api.conflict';
  if (status === 422) return 'errors.api.validation';
  if (status === 429) return 'errors.api.rateLimited';
  if (status >= 500) return 'errors.api.server';
  return 'errors.generic.description';
};
