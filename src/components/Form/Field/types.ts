import type { ReactNode } from 'react';

/** Props a Field passes to its control (spread them onto the native element). */
export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: true | undefined;
  'aria-required'?: true | undefined;
};

export type Props = {
  /** Visible label (also the control's accessible name). */
  label: string;
  /** Help text below the label, announced with the control. */
  description?: ReactNode;
  /** Localized error message. Sets aria-invalid and is announced with the control. */
  error?: string | undefined;
  /** Shows a visual marker and sets aria-required (validation stays in the form schema). */
  required?: boolean | undefined;
  /** Stable id for the control; generated when omitted. */
  id?: string | undefined;
  className?: string | undefined;
  /** Render the control with the wiring props: `{(control) => <Input {...control} />}`. */
  children: (control: FieldControlProps) => ReactNode;
};
