import type { ControlSize, ControlStatus } from '../common/Control/styles';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Visual size of the control. Defaults to 'medium'. */
  controlSize?: ControlSize;
  /** Visual status of the control. Defaults to 'default'. */
  status?: ControlStatus;
  /** Optional leading adornment (icon, etc.). Non-interactive by default. */
  startAdornment?: React.ReactNode;
  /** Optional trailing adornment (icon, buttons). Wrap interactive elements to re-enable pointer events. */
  endAdornment?: React.ReactNode;
  /** Optional suffix displayed after the input value (e.g., units). */
  valueSuffix?: React.ReactNode;
  /** Sets data-testid on the root Control container. */
  dataTestId?: string;

  /** Optional locale-aware formatting mode. */
  format?: 'currency' | 'number';
  /** Optional currency code used when format is 'currency'. Defaults based on locale when not provided. */
  currency?: string;
  /** Maximum fraction digits for number/currency formatting. Defaults to 2 for currency, 0 for numbers. */
  maximumFractionDigits?: number;
  /** Enables/disables thousands grouping. Defaults to true. */
  useGrouping?: boolean;
  /** Callback receiving parsed numeric value as the user types (or null for empty/invalid transient states). */
  onValueChange?: (value: number | null) => void;
  /** Numeric placeholder to be formatted according to locale and format. */
  placeholderNumber?: number;
};
