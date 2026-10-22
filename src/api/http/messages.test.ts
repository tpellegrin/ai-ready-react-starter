import { ApiError, isUnauthenticatedError, type ApiErrorKind } from './errors';
import { getErrorMessageKey } from './messages';

const apiError = (kind: ApiErrorKind, status?: number) =>
  new ApiError({ kind, status, method: 'GET', url: 'http://localhost/api/x' });

describe('getErrorMessageKey', () => {
  it.each([
    [apiError('network'), 'errors.api.network'],
    [apiError('timeout'), 'errors.api.timeout'],
    [apiError('aborted'), 'errors.api.aborted'],
    [apiError('parse', 200), 'errors.api.unexpectedResponse'],
    [apiError('schema', 200), 'errors.api.unexpectedResponse'],
    [apiError('http', 401), 'errors.api.unauthorized'],
    [apiError('http', 403), 'errors.api.forbidden'],
    [apiError('http', 404), 'errors.api.notFound'],
    [apiError('http', 409), 'errors.api.conflict'],
    [apiError('http', 422), 'errors.api.validation'],
    [apiError('http', 429), 'errors.api.rateLimited'],
    [apiError('http', 503), 'errors.api.server'],
    [apiError('http', 418), 'errors.generic.description'],
    [new Error('boom'), 'errors.generic.description'],
    ['not an error', 'errors.generic.description'],
  ])('%s → %s', (error, key) => {
    expect(getErrorMessageKey(error)).toBe(key);
  });
});

describe('isUnauthenticatedError', () => {
  it('is true for an HTTP 401 only', () => {
    expect(isUnauthenticatedError(apiError('http', 401))).toBe(true);
    expect(isUnauthenticatedError(apiError('http', 403))).toBe(false);
    expect(isUnauthenticatedError(apiError('network'))).toBe(false);
    expect(isUnauthenticatedError(new Error('401'))).toBe(false);
  });
});
