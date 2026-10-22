/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { renderWithProviders } from 'test/utils';

import { __Name__ } from './index';

describe('__Name__', () => {
  it('renders its content', () => {
    renderWithProviders(<__Name__ __testProps__>Example content</__Name__>);
    expect(screen.getByText('Example content')).toBeInTheDocument();
  });
});
