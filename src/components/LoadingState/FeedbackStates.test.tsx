import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EmptyState } from 'components/EmptyState';
import { ErrorState } from 'components/ErrorState';
import { Skeleton } from 'components/Skeleton';
import { renderWithProviders } from 'test/utils';

import { LoadingState } from './index';

describe('feedback states', () => {
  it('LoadingState is a polite status with a default localized label', () => {
    renderWithProviders(<LoadingState />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading…');
  });

  it('Skeleton is hidden from assistive technology', () => {
    const { container } = renderWithProviders(<Skeleton width="50%" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('EmptyState renders its heading level, description and next step', () => {
    renderWithProviders(
      <EmptyState
        title="Nothing yet"
        description="Create one."
        headingLevel="h3"
        action={<button type="button">Create</button>}
      />,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Nothing yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Create one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('ErrorState is an alert with an optional retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = renderWithProviders(
      <ErrorState
        title="Could not load"
        description="Try later."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ErrorState title="Could not load" />);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });
});
