import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { InlineAlert } from './index';

const meta = {
  title: 'Components/Feedback/InlineAlert',
  component: InlineAlert,
  args: { children: 'Changes are saved automatically.' },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['info', 'success', 'warning', 'error'],
    },
  },
} satisfies Meta<typeof InlineAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Changes are saved automatically.',
    );
  },
};

export const Success: Story = {
  args: { tone: 'success', children: 'All changes saved.' },
};

export const Warning: Story = {
  args: {
    tone: 'warning',
    title: 'Unsaved changes',
    children: 'Save before leaving.',
  },
};

/** Errors use role="alert" so they are announced immediately. */
export const Error: Story = {
  args: {
    tone: 'error',
    title: 'Could not save',
    children: 'Check your connection and try again.',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Could not save');
  },
};
