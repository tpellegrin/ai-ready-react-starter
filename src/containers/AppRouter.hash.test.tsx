/** @vitest-environment jsdom */
import { hashRouterFactory } from './AppRouter';

describe('hashRouterFactory', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '#/');
  });

  it('starts at the URL when the start path matches it', () => {
    window.history.replaceState(null, '', '#/items?x=1');
    const router = hashRouterFactory([{ path: '*', element: null }], {
      initialPath: '/items?x=1',
    });
    expect(router.state.location).toMatchObject({
      pathname: '/items',
      search: '?x=1',
    });
    router.dispose();
  });

  it('moves the URL to a different start path (a destination kept through onboarding)', () => {
    window.history.replaceState(null, '', '#/flow/onboarding/complete');
    const router = hashRouterFactory([{ path: '*', element: null }], {
      initialPath: '/items?tab=a',
    });
    expect(router.state.location).toMatchObject({
      pathname: '/items',
      search: '?tab=a',
    });
    expect(window.location.hash).toBe('#/items?tab=a');
    router.dispose();
  });
});
