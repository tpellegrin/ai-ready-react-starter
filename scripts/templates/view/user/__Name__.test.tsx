/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { paths } from 'globals/paths';
import { renderApp } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';

window.HTMLElement.prototype.scrollTo = vi.fn();

describe('__Name__ page', () => {
  it('is registered at paths.__key__ for signed-in users', async () => {
    renderApp({
      adapter: createFakeAuthAdapter({ user: testUser }),
      initialPath: paths.__key__,
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: '__title__' }),
    ).toBeInTheDocument();
  });
});
