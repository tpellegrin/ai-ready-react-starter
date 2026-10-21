import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

export type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'children'
> & {
  ref?: Ref<HTMLInputElement> | undefined;
  /** Visible label (clickable, and the accessible name). */
  label: ReactNode;
  description?: ReactNode;
  /** Localized error message (sets aria-invalid). */
  error?: string | undefined;
};
