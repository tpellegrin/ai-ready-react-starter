import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from 'test/utils';

import { Select } from './index';

const options = [
  { value: 'a', label: 'First' },
  { value: 'b', label: 'Second' },
];

describe('Select', () => {
  it('changes value natively and focuses from a click on its chrome', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <Select
        aria-label="Choice"
        dataTestId="chrome"
        options={options}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Choice' });

    await user.selectOptions(select, 'b');
    expect(select).toHaveValue('b');
    expect(onChange).toHaveBeenCalled();

    select.blur();
    await user.click(screen.getByTestId('chrome'));
    expect(select).toHaveFocus();
  });

  it('blocks the picker when read-only', () => {
    renderWithProviders(
      <Select aria-label="Choice" options={options} readOnly />,
    );
    const select = screen.getByRole('combobox', { name: 'Choice' });
    expect(select).toHaveAttribute('aria-readonly', 'true');
    // fireEvent returns false when the default action was prevented.
    expect(fireEvent.mouseDown(select)).toBe(false);
  });

  it('shows a localized, disabled loading option while loading', () => {
    renderWithProviders(
      <Select aria-label="Choice" options={options} isLoading />,
    );
    const select = screen.getByRole('combobox', { name: 'Choice' });
    expect(select).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Loading…' })).toBeDisabled();
  });

  it('renders a placeholder as the initial, disabled option', () => {
    renderWithProviders(
      <Select aria-label="Choice" options={options} placeholder="Pick one" />,
    );
    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Pick one' })).toBeDisabled();
  });
});
