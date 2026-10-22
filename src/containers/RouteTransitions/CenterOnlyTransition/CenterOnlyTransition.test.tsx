/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useLayoutEffect, type ReactNode } from 'react';

import {
  NavigationProvider,
  useNavigation,
} from 'globals/context/NavigationContext';

import { CenterOnlyTransition } from './index';

/** One flow step; registers its navigation like CenterAnimatedOutlet does. */
const Step = ({ name }: { name: string }) => {
  const { registerNavigationCommit } = useNavigation();
  useLayoutEffect(() => {
    registerNavigationCommit(name);
  }, [name, registerNavigationCommit]);
  return (
    <CenterOnlyTransition routeKey={name} direction={1} duration={120}>
      <div data-center-content>
        <h1>{name}</h1>
      </div>
    </CenterOnlyTransition>
  );
};

/** Renders like the dev entry point (main.tsx) when `strict` is true. */
const renderFlow = ({ strict }: { strict: boolean }) => {
  const tree = (name: string): ReactNode => {
    const flow = (
      <div className="app-root">
        <NavigationProvider>
          <Step name={name} />
        </NavigationProvider>
      </div>
    );
    return strict ? <StrictMode>{flow}</StrictMode> : flow;
  };
  const utils = render(tree('first'));
  return { ...utils, goTo: (name: string) => utils.rerender(tree(name)) };
};

const phase = (container: HTMLElement) =>
  container
    .querySelector('[data-center-phase]')
    ?.getAttribute('data-center-phase');

const mockReducedMotion = (reduce: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) satisfies MediaQueryList,
  );

describe('CenterOnlyTransition', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; tests choose the motion preference.
    window.matchMedia ??= () => {
      throw new Error('matchMedia is mocked per test');
    };
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each([
    { strict: false, mode: 'without Strict Mode' },
    { strict: true, mode: 'under Strict Mode (effects replayed)' },
  ])('$mode', ({ strict }) => {
    it('slides to the next step and settles (no transitionend in jsdom: the fallback timer finalizes)', async () => {
      const { container, goTo } = renderFlow({ strict });
      expect(phase(container)).toBe('settled');

      goTo('second');
      expect(phase(container)).toBe('overlay');
      expect(container.querySelector('[data-overlay="exit"]')).not.toBeNull();

      await waitFor(() => expect(phase(container)).toBe('settled'));
      expect(container.querySelector('[data-overlay="exit"]')).toBeNull();
      expect(screen.getByRole('heading', { name: 'second' })).toBeVisible();
      expect(screen.queryByRole('heading', { name: 'first' })).toBeNull();
    });

    it('settles every consecutive step', async () => {
      const { container, goTo } = renderFlow({ strict });
      for (const name of ['second', 'third', 'fourth']) {
        goTo(name);
        await waitFor(() => expect(phase(container)).toBe('settled'));
      }
      expect(screen.getByRole('heading', { name: 'fourth' })).toBeVisible();
    });

    it('settles without animating when the user prefers reduced motion', () => {
      mockReducedMotion(true);
      const { container, goTo } = renderFlow({ strict });

      goTo('second');

      expect(phase(container)).toBe('settled');
      expect(container.querySelector('[data-overlay="exit"]')).toBeNull();
    });

    it('cancels its timers and frames when unmounted mid-transition', async () => {
      const warn = vi.spyOn(console, 'warn');
      const error = vi.spyOn(console, 'error');
      const { container, goTo, unmount } = renderFlow({ strict });
      goTo('second');
      expect(phase(container)).toBe('overlay');

      unmount();
      // Past the fallback and watchdog deadlines.
      await new Promise((resolve) => setTimeout(resolve, 400));

      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });
});
