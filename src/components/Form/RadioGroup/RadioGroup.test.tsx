import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { renderWithProviders } from 'test/utils';

import { RadioGroup } from './index';

const options = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

const Controlled = ({ error }: { error?: string }) => {
  const [value, setValue] = useState<'active' | 'archived'>('active');
  return (
    <RadioGroup
      legend="Status"
      name="status"
      options={options}
      value={value}
      onChange={setValue}
      error={error}
      required
    />
  );
};

describe('RadioGroup', () => {
  it('groups native radios under a legend and supports arrow-key selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Controlled />);

    const group = screen.getByRole('radiogroup', { name: 'Status' });
    expect(group).toHaveAttribute('aria-required', 'true');
    const active = screen.getByRole('radio', { name: 'Active' });
    expect(active).toBeChecked();

    await user.click(active);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Archived' })).toBeChecked();
  });

  it('keeps option descriptions out of the accessible name', () => {
    renderWithProviders(
      <RadioGroup
        legend="Size"
        name="size"
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium', description: 'Recommended.' },
        ]}
        value="small"
        onChange={() => undefined}
      />,
    );
    const medium = screen.getByRole('radio', { name: 'Medium' });
    expect(medium).toHaveAccessibleDescription('Recommended.');
    expect(screen.getByRole('radio', { name: 'Small' })).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('describes the group with its error', () => {
    renderWithProviders(<Controlled error="Choose one" />);
    const group = screen.getByRole('radiogroup', { name: 'Status' });
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(group).toHaveAccessibleDescription('Choose one');
  });
});
