import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { I18nProvider, useI18n } from 'i18n/provider';
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

type FormattingOptions = {
  format: 'number' | 'currency';
  currency?: string;
  fractionDigits: number;
  useGrouping: boolean;
};

/**
 * A numeric field whose locale and formatting options change while it holds
 * an edited value (language switch, currency/precision settings).
 */
const ChangingFormatField = ({
  onValueChange,
}: {
  onValueChange: (value: number | null) => void;
}) => {
  const { setLang } = useI18n();
  const [value, setValue] = useState<number | null>(null);
  const [options, setOptions] = useState<FormattingOptions>({
    format: 'number',
    fractionDigits: 2,
    useGrouping: true,
  });
  const change = (next: Partial<FormattingOptions>) =>
    setOptions((current) => ({ ...current, ...next }));
  return (
    <>
      <Input
        aria-label="Amount"
        format={options.format}
        currency={options.currency}
        maximumFractionDigits={options.fractionDigits}
        useGrouping={options.useGrouping}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange(next);
        }}
      />
      <button type="button" onClick={() => setLang('pt-BR')}>
        Portuguese
      </button>
      <button type="button" onClick={() => change({ useGrouping: false })}>
        No grouping
      </button>
      <button
        type="button"
        onClick={() => change({ format: 'currency', currency: 'EUR' })}
      >
        Euros
      </button>
      <button type="button" onClick={() => change({ fractionDigits: 0 })}>
        Whole numbers
      </button>
      <output aria-label="Value">{String(value)}</output>
    </>
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

  describe('currency', () => {
    const CurrencyInput = ({
      onValueChange,
    }: {
      onValueChange: (value: number | null) => void;
    }) => {
      const [value, setValue] = useState<number | null>(null);
      return (
        <Input
          aria-label="Price"
          format="currency"
          currency="USD"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            onValueChange(next);
          }}
        />
      );
    };

    it('accepts decimals typed character by character', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderWithProviders(<CurrencyInput onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox', { name: 'Price' });

      await user.type(input, '1980.');
      expect(input).toHaveValue('$1,980.');
      await user.type(input, '25');
      expect(input).toHaveValue('$1,980.25');
      expect(onValueChange).toHaveBeenLastCalledWith(1980.25);

      await user.tab();
      expect(input).toHaveValue('$1,980.25');
    });

    it('uses the locale’s separators and currency (pt-BR)', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderWithProviders(
        <I18nProvider initialLocale="pt-BR">
          <CurrencyInput onValueChange={onValueChange} />
        </I18nProvider>,
      );
      const input = screen.getByRole('textbox', { name: 'Price' });

      await user.type(input, '1980,5');
      expect(onValueChange).toHaveBeenLastCalledWith(1980.5);
      expect(input).toHaveValue('US$\u00a01.980,5');
    });
  });

  describe('after editing, follows locale and formatting changes', () => {
    const setup = async (typed: string) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderWithProviders(
        <ChangingFormatField onValueChange={onValueChange} />,
      );
      const input = screen.getByRole('textbox', { name: 'Amount' });
      await user.type(input, typed);
      return { user, input, onValueChange };
    };
    const shownValue = () => screen.getByRole('status', { name: 'Value' });

    it('re-renders the edited value with the new locale separators', async () => {
      const { user, input } = await setup('1234.5');
      expect(input).toHaveValue('1,234.5');

      await user.click(screen.getByRole('button', { name: 'Portuguese' }));

      expect(input).toHaveValue('1.234,5');
      expect(shownValue()).toHaveTextContent('1234.5');
    });

    it('parses later edits with the separators it displays', async () => {
      const { user, input, onValueChange } = await setup('1234.5');
      await user.click(screen.getByRole('button', { name: 'Portuguese' }));

      await user.type(input, '6');

      expect(input).toHaveValue('1.234,56');
      expect(onValueChange).toHaveBeenLastCalledWith(1234.56);
    });

    it('keeps an in-progress decimal across a locale change while focused', async () => {
      const { user, input, onValueChange } = await setup('1234.');
      expect(input).toHaveValue('1,234.');

      // The locale changes without moving focus (blurring settles "1." to "1").
      fireEvent.click(screen.getByRole('button', { name: 'Portuguese' }));
      expect(input).toHaveFocus();
      expect(input).toHaveValue('1.234,');

      await user.type(input, '5');
      expect(input).toHaveValue('1.234,5');
      expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
    });

    it('drops grouping when grouping is turned off', async () => {
      const { user, input } = await setup('1234.5');

      await user.click(screen.getByRole('button', { name: 'No grouping' }));

      expect(input).toHaveValue('1234.5');
    });

    it('switches to currency formatting without changing the value', async () => {
      const { user, input, onValueChange } = await setup('1234.5');
      onValueChange.mockClear();

      await user.click(screen.getByRole('button', { name: 'Euros' }));

      expect(input).toHaveValue('€1,234.50');
      expect(shownValue()).toHaveTextContent('1234.5');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('reports the value it displays when the precision drops', async () => {
      const { user, input, onValueChange } = await setup('1234.56');

      await user.click(screen.getByRole('button', { name: 'Whole numbers' }));

      expect(input).toHaveValue('1,235');
      expect(onValueChange).toHaveBeenLastCalledWith(1235);
      expect(shownValue()).toHaveTextContent('1235');
    });
  });
});
