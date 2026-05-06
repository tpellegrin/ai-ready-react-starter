/** @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from 'styled-components';

import { base } from 'styles/themes/base';
import {
  NavigationProvider,
  useNavigation,
} from 'globals/context/NavigationContext';
import { FlowLayout } from 'containers/Layouts/FlowLayout';
import { BaseLayout } from './index';

type NavigationProbeValue = {
  scrollRef: React.RefObject<HTMLElement | null>;
};

const TestNavigationProbe: React.FC<{
  onRead: (value: NavigationProbeValue) => void;
}> = ({ onRead }) => {
  const navigation = useNavigation();

  useEffect(() => {
    onRead({
      scrollRef: navigation.scrollRef,
    });
  }, [navigation, onRead]);

  return null;
};

const TallFlowPage = ({ scrollInitiallyLocked = false }) => {
  return (
    <FlowLayout
      stickyHeader
      fixedFooter
      scrollInitiallyLocked={scrollInitiallyLocked}
    >
      <div style={{ minHeight: 2000, width: '100%' }}>Tall content</div>
    </FlowLayout>
  );
};

describe('FlowLayout scroll ownership contract', () => {
  it('uses FlowLayout viewport as the active scroller for tall flow content', () => {
    const onNavigationRead = vi.fn();

    const container = document.createElement('div');
    container.className = 'app-root';
    document.body.appendChild(container);

    const { unmount } = render(
      <ThemeProvider theme={base}>
        <NavigationProvider>
          <BaseLayout>
            <TallFlowPage />
          </BaseLayout>
          <TestNavigationProbe onRead={onNavigationRead} />
        </NavigationProvider>
      </ThemeProvider>,
      { container },
    );

    const shellScroller = document.querySelector(
      '[data-app-scroller="shell"]',
    ) as HTMLElement;
    const flowScroller = document.querySelector(
      '[data-app-scroller="flow"]',
    ) as HTMLElement;

    expect(shellScroller).toBeInTheDocument();
    expect(flowScroller).toBeInTheDocument();

    expect(onNavigationRead).toHaveBeenCalled();
    const lastCall =
      onNavigationRead.mock.calls[onNavigationRead.mock.calls.length - 1][0];
    expect(lastCall.scrollRef.current).toBe(flowScroller);

    flowScroller.scrollTop = 120;
    flowScroller.dispatchEvent(new Event('scroll'));
    expect(window.scrollY).toBe(0);

    const scrollRef = lastCall.scrollRef;
    unmount();
    expect(scrollRef.current).not.toBe(flowScroller);
  });

  it('respects flow viewport lock state when mounted as initially locked', () => {
    const container = document.createElement('div');
    container.className = 'app-root';
    document.body.appendChild(container);

    render(
      <ThemeProvider theme={base}>
        <NavigationProvider>
          <BaseLayout>
            <TallFlowPage scrollInitiallyLocked={true} />
          </BaseLayout>
        </NavigationProvider>
      </ThemeProvider>,
      { container },
    );

    const shellScroller = document.querySelector(
      '[data-app-scroller="shell"]',
    ) as HTMLElement;
    const flowScroller = document.querySelector(
      '[data-app-scroller="flow"]',
    ) as HTMLElement;

    expect(shellScroller).toBeInTheDocument();
    expect(flowScroller).toBeInTheDocument();
  });
});
