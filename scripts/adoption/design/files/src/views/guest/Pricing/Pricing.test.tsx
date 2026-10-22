/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { paths } from 'globals/paths';
import { renderApp } from 'test/app';

window.HTMLElement.prototype.scrollTo = vi.fn();

const plan = (name: string) =>
  within(screen.getByRole('list', { name: 'Plans' })).getByRole('article', {
    name,
  });

describe('Pricing page', () => {
  it('is registered at paths.pricing for guests and lists the three plans', async () => {
    renderApp({ initialPath: paths.pricing });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Simple pricing for growing teams',
      }),
    ).toBeInTheDocument();
    expect(plan('Starter')).toHaveTextContent('€0/ monthFree forever');
    expect(plan('Team')).toHaveTextContent('Most popular');
    expect(plan('Team')).toHaveTextContent('€12/ user / monthBilled monthly');
    expect(
      within(plan('Business')).getByRole('link', { name: 'Contact sales' }),
    ).toHaveAttribute('href', 'mailto:sales@ledgerly.example');
  });

  it('shows yearly prices and totals when Yearly is chosen', async () => {
    const user = userEvent.setup();
    renderApp({ initialPath: paths.pricing });
    await user.click(await screen.findByRole('radio', { name: /Yearly/ }));

    expect(plan('Team')).toHaveTextContent(
      '€10/ user / monthBilled yearly: €120 per user',
    );
    expect(plan('Business')).toHaveTextContent(
      '€24/ user / monthBilled yearly: €288 per user',
    );
    expect(plan('Starter')).toHaveTextContent('€0/ monthFree forever');
  });

  it('starts a plan at sign-in', async () => {
    const user = userEvent.setup();
    renderApp({ initialPath: paths.pricing });
    await user.click(
      await screen.findByRole('button', { name: 'Start free trial' }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign In' }),
    ).toBeInTheDocument();
  });
});
