import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Button } from './index';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { label: 'Save changes', onClick: fn() },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary', 'accent'],
    },
    size: {
      control: 'inline-radio',
      options: ['medium', 'small', 'smallTight'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const WithIcons: Story = {
  args: {
    isCompact: true,
    label: 'Next',
    endIcon: <span>→</span>,
  },
  play: async ({ canvas }) => {
    // Icons are decorative: the accessible name is the label only.
    await expect(canvas.getByRole('button')).toHaveAccessibleName('Next');
  },
};

export const Pending: Story = {
  args: { isPending: true, pendingLabel: 'Saving…' },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Saving…' });
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toBeDisabled();
  },
};
