import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Button } from 'components/Button';
import { EmptyState } from 'components/EmptyState';
import { ErrorState } from 'components/ErrorState';
import { Skeleton } from 'components/Skeleton';

import { LoadingState } from './index';

/** The four states every data-driven region needs (see docs/ui/foundation.md). */
const meta = {
  title: 'Components/Feedback/States',
  component: LoadingState,
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => (
    <>
      <LoadingState label="Loading items…" />
      <Skeleton height="xxl" />
      <Skeleton height="xxl" width="60%" />
    </>
  ),
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveTextContent('Loading items…');
  },
};

export const Empty: StoryObj<typeof EmptyState> = {
  render: () => (
    <EmptyState
      title="No items yet"
      description="Items you create appear here."
      action={<Button isCompact label="New item" />}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'No items yet' }),
    ).toBeInTheDocument();
  },
};

export const Failed: StoryObj<typeof ErrorState> = {
  args: { onRetry: fn() },
  render: (args) => (
    <ErrorState
      title="We couldn't load items"
      description="Something went wrong on our side. Try again."
      onRetry={args.onRetry}
    />
  ),
  play: async ({ args, canvas, userEvent }) => {
    const alert = canvas.getByRole('alert');
    await expect(alert).toHaveTextContent("We couldn't load items");
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const Retrying: StoryObj<typeof ErrorState> = {
  render: () => (
    <ErrorState
      title="We couldn't load items"
      onRetry={() => undefined}
      isRetrying
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Try again' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};
