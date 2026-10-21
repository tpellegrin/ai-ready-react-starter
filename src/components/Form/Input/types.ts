import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

import type { ControlSize, ControlStatus } from '../common/Control/styles';

export type NumberFormatMode = 'currency' | 'number';

/** Props consumed by the formatting/caret logic (useInputLogic). */
export type InputLogicProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'id'
  | 'type'
  | 'inputMode'
  | 'onChange'
  | 'onClick'
  | 'onPointerDown'
  | 'onBlur'
  | 'placeholder'
  | 'disabled'
> & {
  /**
   * Text value, or a number when `format` is set. `null` means "no number"
   * (empty field) and is preserved as null, never coerced to 0.
   */
  value?: string | number | null | undefined;
  /** Optional locale-aware formatting mode (renders a text input). */
  format?: NumberFormatMode | undefined;
  /** Currency code when format is 'currency'. Defaults from the locale. */
  currency?: string | undefined;
  /** Maximum fraction digits. Defaults to 2 for currency, 0 for numbers. */
  maximumFractionDigits?: number | undefined;
  /** Enables/disables thousands grouping. Defaults to true. */
  useGrouping?: boolean | undefined;
  /**
   * Numeric mode: receives the parsed number as the user types, or null for
   * empty/incomplete input. No synthetic DOM event is involved.
   */
  onValueChange?: ((value: number | null) => void) | undefined;
  /** Numeric placeholder formatted for the current locale. */
  placeholderNumber?: number | undefined;
};

export type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  keyof InputLogicProps | 'size' | 'children'
> &
  InputLogicProps & {
    ref?: Ref<HTMLInputElement> | undefined;
    /** Visual size of the control. Defaults to 'medium'. */
    controlSize?: ControlSize | undefined;
    /** Visual status. 'error' also sets aria-invalid. Defaults to 'default'. */
    status?: ControlStatus | undefined;
    /** Leading adornment (icon, etc.). Non-interactive by default. */
    startAdornment?: ReactNode;
    /** Trailing adornment. Interactive children keep their own focus. */
    endAdornment?: ReactNode;
    /** Suffix displayed after the value (e.g. units). */
    valueSuffix?: ReactNode;
    /** Sets data-testid on the control chrome. */
    dataTestId?: string | undefined;
  };
