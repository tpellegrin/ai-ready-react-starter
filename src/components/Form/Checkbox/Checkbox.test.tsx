import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from 'test/utils';

import { Checkbox } from './index';

describe('Checkbox', () => {
  it('is a native checkbox toggled by its label and the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <Checkbox
        label="Featured"
        description="Pin to top"
        onChange={onChange}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Featured' });
    expect(checkbox).toHaveAccessibleDescription('Pin to top');

    await user.click(screen.getByText('Featured'));
    expect(checkbox).toBeChecked();
    await user.keyboard(' ');
    expect(checkbox).not.toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('exposes errors to assistive technology', () => {
    renderWithProviders(<Checkbox label="Accept" error="Required" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Accept' });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('Required');
  });
});
