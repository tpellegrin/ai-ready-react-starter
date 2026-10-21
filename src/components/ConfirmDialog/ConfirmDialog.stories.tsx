import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';

import { ConfirmDialog } from './index';

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'Delete this item?',
    description: '“Example item” will be removed. This cannot be undone.',
    confirmLabel: 'Delete item',
    onOpenChange: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Initial focus is on Cancel, so Enter never confirms by accident. */
export const Default: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Delete this item?',
    });
    await expect(dialog).toHaveAccessibleDescription(
      '“Example item” will be removed. This cannot be undone.',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete item' }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** While pending, dismissal is blocked and confirm cannot fire twice. */
export const Pending: Story = {
  args: { isPending: true },
  play: async ({ args, userEvent }) => {
    await screen.findByRole('alertdialog');
    await userEvent.keyboard('{Escape}');
    await expect(args.onOpenChange).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Delete item' });
    await expect(confirm).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(confirm);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** A failed attempt keeps the dialog open with the error inline. */
export const WithError: Story = {
  args: { error: 'Something went wrong on our side. Try again.' },
  play: async () => {
    const dialog = await screen.findByRole('alertdialog');
    await expect(dialog).toHaveTextContent(
      'Something went wrong on our side. Try again.',
    );
  },
};
