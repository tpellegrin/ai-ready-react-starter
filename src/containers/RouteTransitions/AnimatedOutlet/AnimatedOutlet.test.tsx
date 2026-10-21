/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, useNavigate } from 'react-router-dom';

import { renderApp, type RouteTable } from 'test/app';

window.HTMLElement.prototype.scrollTo = vi.fn();

const SecondPage = () => {
  const navigate = useNavigate();
  return (
    <main>
      <h1>Second page</h1>
      <button
        type="button"
        onClick={() => {
          navigate(-1);
        }}
      >
        Back
      </button>
    </main>
  );
};

const routes: RouteTable = {
  guest: [
    {
      path: '/',
      element: (
        <main>
          <h1>First page</h1>
          <Link to="/second">Next</Link>
        </main>
      ),
    },
    { path: '/second', element: <SecondPage /> },
  ],
  onboarding: [],
  user: [],
};

describe('AnimatedOutlet', () => {
  it('hides the exiting page from assistive technology while it fades out', async () => {
    const user = userEvent.setup();
    renderApp({ routes });
    await user.click(await screen.findByRole('link', { name: 'Next' }));

    // Both pages are in the DOM during the fade, but only one is exposed.
    const exiting = screen
      .getByText('First page')
      .closest('[data-testid="animated-outlet-container"]');
    expect(exiting).toHaveAttribute('inert');
    expect(exiting).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Second page' })).toBeVisible();

    await waitFor(() => expect(screen.queryByText('First page')).toBeNull());
  });

  it('exposes a page again when it re-enters before its exit finished', async () => {
    const user = userEvent.setup();
    renderApp({ routes });
    await user.click(await screen.findByRole('link', { name: 'Next' }));
    // Back while the first page is still fading out reuses its node.
    await user.click(screen.getByRole('button', { name: 'Back' }));

    const first = await screen.findByRole('heading', { name: 'First page' });
    const container = first.closest(
      '[data-testid="animated-outlet-container"]',
    );
    expect(container).not.toHaveAttribute('inert');
    expect(container).not.toHaveAttribute('aria-hidden');
  });
});
