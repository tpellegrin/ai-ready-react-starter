import { matchPath } from 'react-router-dom';

export const RETURN_TO_PARAM = 'returnTo';

export const matchesAnyPattern = (
  pathname: string,
  patterns: readonly string[],
): boolean =>
  patterns.some(
    (pattern) => matchPath({ path: pattern, end: true }, pathname) !== null,
  );

/** `/sign-in?returnTo=<current path + search>` */
export const buildSignInRedirect = (
  signInPath: string,
  location: { pathname: string; search: string },
): string => {
  const params = new URLSearchParams({
    [RETURN_TO_PARAM]: `${location.pathname}${location.search}`,
  });
  return `${signInPath}?${params.toString()}`;
};

/**
 * The `returnTo` destination from a query string, or null unless it is a
 * root-relative in-app path that matches one of `allowedPatterns`. Rejects
 * absolute and protocol-relative URLs, backslashes and unknown routes, so it
 * cannot be used as an open redirect.
 */
export const getSafeReturnTo = (
  search: string,
  allowedPatterns: readonly string[],
): string | null => {
  const value = new URLSearchParams(search).get(RETURN_TO_PARAM);
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return null;
  }
  const pathname = value.split(/[?#]/, 1)[0] ?? '';
  return matchesAnyPattern(pathname, allowedPatterns) ? value : null;
};
