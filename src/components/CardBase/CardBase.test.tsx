import { screen } from '@testing-library/react';
import { createRef } from 'react';

import { Box } from 'components/Box';
import { renderWithProviders } from 'test/utils';

import { CardBase } from './index';

describe('Box and CardBase', () => {
  it('CardBase renders a card surface around its content and forwards its ref', () => {
    const ref = createRef<HTMLDivElement>();
    renderWithProviders(
      <CardBase ref={ref} elevation="sm">
        <p>Card content</p>
      </CardBase>,
    );
    const content = screen.getByText('Card content');
    expect(ref.current).toContainElement(content);
    expect(getComputedStyle(ref.current as HTMLDivElement).borderStyle).toBe(
      'solid',
    );
  });

  it('Box passes through native attributes and theme-driven styles', () => {
    renderWithProviders(
      <Box
        role="region"
        aria-label="Summary"
        gradient="card"
        pxDesktop="lg"
        pyDesktop="lg"
      >
        Summary
      </Box>,
    );
    expect(screen.getByRole('region', { name: 'Summary' })).toHaveTextContent(
      'Summary',
    );
  });
});
