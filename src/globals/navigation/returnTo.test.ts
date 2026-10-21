import { buildSignInRedirect, getSafeReturnTo } from './returnTo';

const patterns = ['/', '/settings', '/items/:id'];

describe('getSafeReturnTo', () => {
  it.each([
    ['?returnTo=%2Fsettings', '/settings'],
    ['?returnTo=%2Fsettings%3Ftab%3Dprofile', '/settings?tab=profile'],
    ['?returnTo=%2Fitems%2F42', '/items/42'],
  ])('accepts in-app destination %s', (search, expected) => {
    expect(getSafeReturnTo(search, patterns)).toBe(expected);
  });

  it.each([
    '',
    '?returnTo=',
    '?returnTo=settings',
    '?returnTo=%2F%2Fevil.example',
    '?returnTo=https%3A%2F%2Fevil.example%2Fsettings',
    '?returnTo=%2F%5Cevil.example',
    '?returnTo=%2Funknown',
  ])('rejects %j', (search) => {
    expect(getSafeReturnTo(search, patterns)).toBeNull();
  });
});

describe('buildSignInRedirect', () => {
  it('encodes the full current location', () => {
    expect(
      buildSignInRedirect('/sign-in', {
        pathname: '/items/7',
        search: '?q=a b',
      }),
    ).toBe('/sign-in?returnTo=%2Fitems%2F7%3Fq%3Da+b');
  });

  it('round-trips through getSafeReturnTo', () => {
    const redirect = buildSignInRedirect('/sign-in', {
      pathname: '/items/7',
      search: '?q=a',
    });
    expect(
      getSafeReturnTo(redirect.slice(redirect.indexOf('?')), patterns),
    ).toBe('/items/7?q=a');
  });
});
