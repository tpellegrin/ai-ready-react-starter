/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from 'test/utils';
import { paths } from 'globals/paths';
import { DemoHub } from '../index';

describe('DemoHub view', () => {
  const renderHub = () =>
    renderWithProviders(<DemoHub />, {
      withRouter: true,
      initialEntries: [paths.demo],
    });

  it('renders the starter overview heading and demo badge', () => {
    renderHub();

    expect(screen.getByTestId('demo-hub-badge')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /starter overview/i }),
    ).toBeInTheDocument();
  });

  it('exposes a removal note pointing to docs/adoption.md', () => {
    renderHub();

    expect(screen.getByText(/docs\/adoption\.md/i)).toBeInTheDocument();
  });

  it('renders links to existing demo routes with correct hrefs', () => {
    renderHub();

    const expected: Array<[string, string]> = [
      ['demo-hub-link-signIn', paths.signIn],
      ['demo-hub-link-welcome', paths.welcome],
      ['demo-hub-link-dashboard', paths.signIn],
      ['demo-hub-link-onboarding', paths.flow.onboarding.welcome],
    ];

    for (const [testId, target] of expected) {
      const link = screen.getByTestId(testId);
      expect(link).toHaveAttribute('href', target);
    }
  });
});
