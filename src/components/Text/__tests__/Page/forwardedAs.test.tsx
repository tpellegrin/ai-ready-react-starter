import { screen } from '@testing-library/react';

import { renderWithProviders } from 'test/utils';

import { _PageTitle } from './styles';

/**
 * The documented way to change the element of a styled(Text) wrapper
 * (docs/ui/foundation.md#public-components-and-internals): `forwardedAs`
 * hands `as` on to Text. styled-components' own `as` would replace Text
 * instead, dropping its variant and typography. This keeps the guidance
 * true across styled-components upgrades.
 */
it('`forwardedAs` on a styled(Text) wrapper changes the element and keeps Text', () => {
  renderWithProviders(
    <_PageTitle forwardedAs="h2" variant="headingLg">
      Title
    </_PageTitle>,
  );

  const heading = screen.getByRole('heading', { level: 2, name: 'Title' });
  expect(heading).not.toHaveAttribute('variant');
  // headingLg's size, not the browser default for h2 (1.5em).
  expect(getComputedStyle(heading).fontSize).toBe('2rem');
});
