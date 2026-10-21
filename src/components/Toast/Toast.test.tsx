import { renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from 'test/utils';

import { useToast } from './index';

const Trigger = () => {
  const { showToast } = useToast();
  return (
    <>
      <button type="button" onClick={() => showToast({ title: 'Saved' })}>
        Save
      </button>
      <button
        type="button"
        onClick={() =>
          showToast({
            title: 'Failed',
            description: 'Try again.',
            tone: 'error',
          })
        }
      >
        Fail
      </button>
    </>
  );
};

describe('Toast', () => {
  it('shows notifications in the labelled region and dismisses them', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Trigger />);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Fail' }));
    const region = screen.getByRole('region', { name: /Notifications/ });
    expect(within(region).getByText('Saved')).toBeInTheDocument();
    expect(within(region).getByText('Try again.')).toBeInTheDocument();

    const [dismissSaved] = within(region).getAllByRole('button', {
      name: 'Dismiss notification',
    });
    if (!dismissSaved) throw new Error('missing dismiss button');
    await user.click(dismissSaved);
    await waitFor(() => expect(within(region).queryByText('Saved')).toBeNull());
    expect(within(region).getByText('Failed')).toBeInTheDocument();
  });

  it('requires the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within ToastProvider',
    );
  });
});
