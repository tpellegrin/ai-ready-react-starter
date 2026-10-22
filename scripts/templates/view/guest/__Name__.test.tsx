/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { paths } from 'globals/paths';
import { renderApp } from 'test/app';

window.HTMLElement.prototype.scrollTo = vi.fn();

describe('__Name__ page', () => {
  it('is registered at paths.__key__ for guests', async () => {
    renderApp({ initialPath: paths.__key__ });
    expect(
      await screen.findByRole('heading', { level: 1, name: '__title__' }),
    ).toBeInTheDocument();
  });
});
