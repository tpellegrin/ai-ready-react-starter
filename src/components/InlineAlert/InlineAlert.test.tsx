import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ErrorState } from 'components/ErrorState';
import { LoadingState } from 'components/LoadingState';
import { renderWithProviders } from 'test/utils';

import { InlineAlert } from './index';

describe('feedback primitives', () => {
  it('announces errors assertively and other tones politely', () => {
    renderWithProviders(
      <>
        <InlineAlert tone="error" title="Save failed">
          Try again
        </InlineAlert>
        <InlineAlert tone="success">Saved</InlineAlert>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Save failedTry again');
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('LoadingState is a polite status with localized default text', () => {
    renderWithProviders(<LoadingState />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading…');
  });

  it('ErrorState offers a recoverable retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithProviders(
      <ErrorState
        title="Could not load"
        description="Offline"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
