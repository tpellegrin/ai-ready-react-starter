import type { ControlSize, ControlStatus } from '../common/Control/styles';

export type SelectOption = {
  label: React.ReactNode;
  value: string | number;
  disabled?: boolean;
};

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> & {
  /** Visual size of the control. Defaults to 'medium'. */
  controlSize?: ControlSize;
  /** Visual status of the control. Defaults to 'default'. */
  status?: ControlStatus;
  /** Optional leading adornment (icon, etc.). Non-interactive by default. */
  startAdornment?: React.ReactNode;
  /** Optional trailing adornment (icon, buttons). Wrap interactive elements to re-enable pointer events. */
  endAdornment?: React.ReactNode;
  /** Optional placeholder label rendered as a disabled first option when uncontrolled. */
  placeholder?: string;
  /** When true, shows a disabled “Loading…” option and disables interaction. */
  isLoading?: boolean;
  /** Prevents opening the native picker while keeping the field focusable. */
  readOnly?: boolean;
  /** Options to render as <option> elements; replaces children usage. */
  options: SelectOption[];
  /** Sets data-testid on the root Control container. */
  dataTestId?: string;
};
