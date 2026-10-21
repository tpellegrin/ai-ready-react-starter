import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { I18nProvider } from 'i18n/provider';
import { renderWithProviders } from 'test/utils';

import { Input } from '../index';

const NumericInput = ({
  onValueChange,
  initial = null,
  fractionDigits = 0,
}: {
  onValueChange: (value: number | null) => void;
  initial?: number | null;
  fractionDigits?: number;
}) => {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <Input
      aria-label="Amount"
      format="number"
      inputMode="decimal"
      maximumFractionDigits={fractionDigits}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    />
  );
};

describe('Input (numeric mode)', () => {
  it('groups digits while typing and reports numbers, not strings', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<NumericInput onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '1234567');
    expect(input).toHaveValue('1,234,567');
    expect(onValueChange).toHaveBeenLastCalledWith(1234567);
  });

  it('reports null (never 0) when emptied', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <NumericInput initial={42} onValueChange={onValueChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(input).toHaveValue('42');

    await user.clear(input);
    expect(input).toHaveValue('');
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('accepts decimals up to the configured precision', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <NumericInput fractionDigits={2} onValueChange={onValueChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '1234.');
    expect(input).toHaveValue('1,234.');
    expect(onValueChange).toHaveBeenLastCalledWith(1234);

    await user.type(input, '50');
    expect(input).toHaveValue('1,234.50');
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);

    // Digits beyond the precision are dropped, so value and display agree.
    await user.type(input, '9');
    expect(input).toHaveValue('1,234.50');
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);

    // Leaving the field settles the display.
    await user.tab();
    expect(input).toHaveValue('1,234.5');
  });

  it('uses the locale decimal separator (pt-BR)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <I18nProvider initialLocale="pt-BR">
        <NumericInput fractionDigits={2} onValueChange={onValueChange} />
      </I18nProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '1234,5');
    expect(input).toHaveValue('1.234,5');
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
  });

  it('ignores a decimal separator in whole-number fields', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<NumericInput onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '12.');
    expect(input).toHaveValue('12');
    expect(onValueChange).toHaveBeenLastCalledWith(12);
  });

  it('ignores letters', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<NumericInput onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });

    await user.type(input, '1a2b');
    expect(input).toHaveValue('12');
    expect(onValueChange).toHaveBeenLastCalledWith(12);
  });
});
