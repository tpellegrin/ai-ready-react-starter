import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { Checkbox } from './index';

const meta = {
  title: 'Components/Form/Checkbox',
  component: Checkbox,
  args: { label: 'Email me about updates', onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Email me about updates',
    });
    // The visible label is part of the hit target.
    await userEvent.click(canvas.getByText('Email me about updates'));
    await expect(checkbox).toBeChecked();
    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

export const WithDescription: Story = {
  args: { description: 'At most once a month.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAccessibleDescription(
      'At most once a month.',
    );
  },
};

export const WithError: Story = {
  args: { error: 'Accept the terms to continue.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};
