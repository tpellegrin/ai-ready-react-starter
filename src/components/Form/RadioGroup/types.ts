import type { ReactNode, Ref } from 'react';

export type RadioOption<TValue extends string> = {
  value: TValue;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
};

export type Props<TValue extends string> = {
  /** Visible group label (rendered as the fieldset legend). */
  legend: string;
  name: string;
  options: readonly RadioOption<TValue>[];
  /** Controlled value (use with React Hook Form's Controller). */
  value: TValue | undefined;
  onChange: (value: TValue) => void;
  onBlur?: (() => void) | undefined;
  description?: ReactNode;
  /** Localized error message (sets aria-invalid on the group). */
  error?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Receives the selected (or first) radio, so forms can focus the group. */
  ref?: Ref<HTMLInputElement> | undefined;
};
