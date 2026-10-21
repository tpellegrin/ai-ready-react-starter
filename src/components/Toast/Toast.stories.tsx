import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, waitFor } from 'storybook/test';

import { Button } from 'components/Button';

import { useToast, type ToastTone } from './index';

/** ToastProvider is part of the app providers (and the Storybook decorator). */
const ToastTrigger = ({ tone, title }: { tone: ToastTone; title: string }) => {
  const { showToast } = useToast();
  return (
    <Button
      isCompact
      label="Show notification"
      onClick={() => showToast({ title, tone })}
    />
  );
};

const meta = {
  title: 'Components/Feedback/Toast',
  component: ToastTrigger,
  args: { tone: 'success', title: 'Item saved' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['success', 'info', 'error'] },
  },
} satisfies Meta<typeof ToastTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show notification' }),
    );
    await expect(await screen.findByText('Item saved')).toBeVisible();

    await userEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    await waitFor(() => expect(screen.queryByText('Item saved')).toBeNull());
  },
};

export const ErrorTone: Story = {
  args: { tone: 'error', title: 'Could not save' },
};
