// @fixture-path src/components/__arch__/Example.test.tsx
// @expect none
// Tests may use test utilities and mocks.
import { screen } from '@testing-library/react';

import { handlers } from 'mocks/handlers';
import { renderWithProviders } from 'test/utils';

it('renders', () => {
  renderWithProviders(<p>{handlers.length}</p>);
  expect(screen.getByText('0')).toBeInTheDocument();
});
