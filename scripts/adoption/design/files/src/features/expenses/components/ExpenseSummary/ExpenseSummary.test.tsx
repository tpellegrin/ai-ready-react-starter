/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { appConfig } from 'config';
import { server } from 'mocks/node';
import { renderWithProviders } from 'test/utils';

import { expenseHandlers } from '../../mocks';

import { ExpenseSummary } from './index';

describe('ExpenseSummary', () => {
  beforeEach(() => {
    server.use(...expenseHandlers);
  });

  it('sums the loaded expenses: total amount, pending and approved', async () => {
    renderWithProviders(<ExpenseSummary />);
    const summary = await screen.findByRole('region', { name: 'Summary' });
    const tiles = await within(summary).findAllByRole('listitem');
    await within(tiles[0] as HTMLElement).findByText('$1,234.50');
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      'Total$1,234.50',
      'Pending1',
      'Approved2',
    ]);
  });

  it('stays out of the way when there is nothing to sum', async () => {
    server.use(
      http.get(`${appConfig.apiBaseUrl}/expenses`, () =>
        HttpResponse.json({ items: [] }),
      ),
    );
    renderWithProviders(<ExpenseSummary />);
    // Skeletons hold the space while loading, then the region goes away.
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(summary.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Summary' }),
      ).not.toBeInTheDocument(),
    );
  });
});
