import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { RadioGroup } from './index';

type Size = 'small' | 'medium' | 'large';

const options = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium', description: 'Recommended.' },
  { value: 'large', label: 'Large' },
] as const;

const ControlledRadioGroup = ({
  onChange,
  error,
}: {
  onChange: (value: Size) => void;
  error?: string | undefined;
}) => {
  const [value, setValue] = useState<Size | undefined>('medium');
  return (
    <RadioGroup<Size>
      legend="Size"
      name="size"
      options={options}
      value={value}
      error={error}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

const meta = {
  title: 'Components/Form/RadioGroup',
  component: ControlledRadioGroup,
  args: { onChange: fn() },
} satisfies Meta<typeof ControlledRadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const group = canvas.getByRole('radiogroup', { name: 'Size' });
    await expect(group).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('radio', { name: 'Medium' }));
    // Arrow keys move the selection inside the group (native behaviour).
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('radio', { name: 'Large' })).toBeChecked();
    await expect(args.onChange).toHaveBeenLastCalledWith('large');
  },
};

export const WithError: Story = {
  args: { error: 'Choose a size.' },
};
