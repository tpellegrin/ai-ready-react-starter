import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { Input } from '../Input';
import { Select } from '../Select';
import { Textarea } from '../Textarea';

import { Field } from './index';

const meta = {
  title: 'Components/Form/Field',
  component: Field,
  args: {
    label: 'Display name',
    children: (control) => <Input {...control} />,
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  args: { description: 'Shown to other people.', required: true },
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: 'Display name' });
    await expect(input).toHaveAccessibleDescription('Shown to other people.');
    await expect(input).toHaveAttribute('aria-required', 'true');
    await userEvent.type(input, 'Ada');
    await expect(input).toHaveValue('Ada');
  },
};

export const WithError: Story = {
  args: {
    description: 'Shown to other people.',
    error: 'This field is required.',
    required: true,
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Display name' });
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(
      'Shown to other people. This field is required.',
    );
  },
};

const NumericField = ({
  onValueChange,
  fractionDigits = 0,
}: {
  onValueChange: (value: number | null) => void;
  fractionDigits?: number;
}) => {
  const [value, setValue] = useState<number | null>(null);
  return (
    <Field
      label="Quantity"
      description={fractionDigits ? 'Up to two decimals.' : 'A whole number.'}
    >
      {(control) => (
        <Input
          {...control}
          format="number"
          inputMode="numeric"
          maximumFractionDigits={fractionDigits}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
        />
      )}
    </Field>
  );
};

/** Numeric input: formats for the locale and reports `number | null`. */
export const NumericInput: StoryObj<typeof NumericField> = {
  args: { onValueChange: fn() },
  render: (args) => <NumericField {...args} />,
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: 'Quantity' });
    await userEvent.type(input, '12345');
    await expect(input).toHaveValue('12,345');
    await expect(args.onValueChange).toHaveBeenLastCalledWith(12345);
    await userEvent.clear(input);
    await expect(args.onValueChange).toHaveBeenLastCalledWith(null);
  },
};

/** Decimals can be typed character by character ("12." then "5"). */
export const DecimalInput: StoryObj<typeof NumericField> = {
  args: { onValueChange: fn(), fractionDigits: 2 },
  render: (args) => <NumericField {...args} />,
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: 'Quantity' });
    await userEvent.type(input, '1234.');
    await expect(input).toHaveValue('1,234.');
    await userEvent.type(input, '05');
    await expect(input).toHaveValue('1,234.05');
    await expect(args.onValueChange).toHaveBeenLastCalledWith(1234.05);
  },
};

export const WithSelect: Story = {
  args: {
    label: 'Category',
    children: (control) => (
      <Select
        {...control}
        defaultValue="b"
        options={[
          { value: 'a', label: 'First' },
          { value: 'b', label: 'Second' },
          { value: 'c', label: 'Third' },
        ]}
      />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const select = canvas.getByRole('combobox', { name: 'Category' });
    await expect(select).toHaveValue('b');
    await userEvent.selectOptions(select, 'c');
    await expect(select).toHaveValue('c');
  },
};

/**
 * Clicking the chrome around the select (adornments are pointer-transparent)
 * focuses it and asks for the native picker, which browsers may refuse
 * without a trusted gesture.
 */
export const SelectChromeClick: Story = {
  args: {
    label: 'Sort by',
    children: (control) => (
      <Select
        {...control}
        dataTestId="sort-control"
        startAdornment={<span aria-hidden="true">↕</span>}
        options={[
          { value: 'name', label: 'Name' },
          { value: 'date', label: 'Date' },
        ]}
      />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByTestId('sort-control'));
    await expect(
      canvas.getByRole('combobox', { name: 'Sort by' }),
    ).toHaveFocus();
  },
};

export const WithTextarea: Story = {
  args: {
    label: 'Notes',
    description: 'Optional.',
    children: (control) => <Textarea {...control} rows={3} />,
  },
};
