import { RouterType } from 'globals/types';

import { nextRouterSession, type RouterSession } from './routerSession';
import type { RouteTable } from './types';

const page = () => null;
const routes: RouteTable = {
  guest: [
    { path: '/', Component: page },
    { path: '/sign-in', Component: page },
  ],
  onboarding: [{ path: '/flow/setup/start', Component: page }],
  user: [
    { path: '/', Component: page },
    { path: '/items/:id', Component: page },
  ],
};
const unknown: RouterSession = {
  group: null,
  startPath: '/',
  pendingDestination: null,
};
const at = (
  group: RouterType,
  pendingDestination: string | null = null,
): RouterSession => ({ group, startPath: '/', pendingDestination });

describe('nextRouterSession', () => {
  it('keeps the session while the group does not change', () => {
    const current = at(RouterType.user);
    expect(
      nextRouterSession(current, RouterType.user, '/items/1', routes),
    ).toBe(current);
  });

  it('starts the first router where the app was opened', () => {
    expect(
      nextRouterSession(unknown, RouterType.guest, '/items/1?x=1', routes),
    ).toEqual({
      group: RouterType.guest,
      startPath: '/items/1?x=1',
      pendingDestination: null,
    });
  });

  it.each([
    [
      'a safe returnTo from sign-in',
      '/sign-in?returnTo=%2Fitems%2F7%3Ftab%3Da',
      '/items/7?tab=a',
    ],
    ['the protected page itself', '/items/7?tab=a', '/items/7?tab=a'],
    [
      'nothing for an unsafe returnTo',
      '/sign-in?returnTo=%2F%2Fevil.example',
      null,
    ],
    ['nothing for an unknown returnTo', '/sign-in?returnTo=%2Fnope', null],
    ['nothing for a page every group shares', '/', null],
    ['nothing for an onboarding step', '/flow/setup/start', null],
  ])('entering onboarding keeps %s', (_, lastPath, destination) => {
    expect(
      nextRouterSession(
        at(RouterType.guest),
        RouterType.onboarding,
        lastPath,
        routes,
      ),
    ).toEqual({
      group: RouterType.onboarding,
      startPath: lastPath,
      pendingDestination: destination,
    });
  });

  it('opens the kept destination when onboarding ends, then forgets it', () => {
    const next = nextRouterSession(
      at(RouterType.onboarding, '/items/7?tab=a'),
      RouterType.user,
      '/flow/setup/start',
      routes,
    );
    expect(next).toEqual({
      group: RouterType.user,
      startPath: '/items/7?tab=a',
      pendingDestination: null,
    });
  });

  it('without a destination, the user router starts where onboarding ended', () => {
    expect(
      nextRouterSession(
        at(RouterType.onboarding),
        RouterType.user,
        '/flow/setup/start',
        routes,
      ).startPath,
    ).toBe('/flow/setup/start');
  });

  it('signing out discards a kept destination', () => {
    expect(
      nextRouterSession(
        at(RouterType.onboarding, '/items/7'),
        RouterType.guest,
        '/flow/setup/start',
        routes,
      ).pendingDestination,
    ).toBeNull();
  });
});
