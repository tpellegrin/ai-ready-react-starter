/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { appConfig } from 'config';
import { injectFault } from 'mocks/faults';
import { server } from 'mocks/node';
import { renderWithProviders } from 'test/utils';

import { __entity__Fixtures, __entity__Handlers } from '../../mocks';

import { __Feature__Panel } from './index';

describe('__Feature__Panel', () => {
  beforeEach(() => {
    // Also registered in src/mocks/handlers.ts; kept here so the test is
    // self-contained.
    server.use(...__entity__Handlers);
  });

  it('shows loading, then the items from the API', async () => {
    renderWithProviders(<__Feature__Panel />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      '__loading_copy__',
    );
    const list = await screen.findByRole('list', { name: '__FeatureTitle__' });
    expect(within(list).getAllByRole('heading', { level: 2 })).toHaveLength(
      __entity__Fixtures.length,
    );
  });

  it('shows the empty state', async () => {
    server.use(
      http.get(`${appConfig.apiBaseUrl}/__feature_path__`, () =>
        HttpResponse.json({ items: [] }),
      ),
    );
    renderWithProviders(<__Feature__Panel />);
    expect(
      await screen.findByRole('heading', { name: 'Nothing here yet' }),
    ).toBeInTheDocument();
  });

  it('recovers from a failed load with "Try again"', async () => {
    const user = userEvent.setup();
    injectFault('__feature__.list');
    renderWithProviders(<__Feature__Panel />);

    const title = await screen.findByText("We couldn't load this list");
    const alert = title.closest<HTMLElement>('[role="alert"]');
    if (!alert) throw new Error('error state is not announced as an alert');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('list', { name: '__FeatureTitle__' }),
    ).toBeInTheDocument();
  });
});
