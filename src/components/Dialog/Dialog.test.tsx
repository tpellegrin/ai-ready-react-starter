import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';

import { ConfirmDialog } from 'components/ConfirmDialog';
import { renderWithProviders } from 'test/utils';

import { Dialog } from './index';

const DialogHarness = ({ removeOpenerOnClose = false }) => {
  const [open, setOpen] = useState(false);
  const [openerVisible, setOpenerVisible] = useState(true);
  const fallbackRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={fallbackRef} type="button">
        Fallback
      </button>
      {openerVisible ? (
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && removeOpenerOnClose) setOpenerVisible(false);
        }}
        title="Details"
        description="More information."
        fallbackFocus={() => fallbackRef.current}
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        }
      >
        <input aria-label="Notes" />
      </Dialog>
    </>
  );
};

describe('Dialog', () => {
  it('is labelled, moves focus inside, and returns it to the opener', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog', { name: 'Details' });
    expect(dialog).toHaveAccessibleDescription('More information.');
    await waitFor(() =>
      expect(
        within(dialog).getByRole('textbox', { name: 'Notes' }),
      ).toHaveFocus(),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('focuses the fallback when the opener is gone after closing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DialogHarness removeOpenerOnClose />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Fallback' })).toHaveFocus();
  });
});

describe('ConfirmDialog', () => {
  const renderConfirm = (
    props: Partial<Parameters<typeof ConfirmDialog>[0]> = {},
  ) => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        title="Delete item?"
        description="This cannot be undone."
        confirmLabel="Delete"
        {...props}
      />,
    );
    return { onOpenChange, onConfirm };
  };

  it('starts on Cancel and confirms explicitly', async () => {
    const user = userEvent.setup();
    const { onConfirm, onOpenChange } = renderConfirm();
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete item?',
    });
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Cancel' }),
      ).toHaveFocus(),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('blocks dismissal while pending and shows errors inline', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderConfirm({
      isPending: true,
      error: 'Something went wrong.',
    });
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Something went wrong.',
    );

    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole('button', { name: 'Delete' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
