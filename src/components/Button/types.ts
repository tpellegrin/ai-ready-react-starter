import type { ReactNode } from 'react';

import type { ButtonBaseProps } from 'components/ButtonBase';

export type ButtonSize = 'small' | 'smallTight' | 'medium';
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'accent';

export type Props = Omit<ButtonBaseProps, 'children'> & {
  /** Visible text and accessible name. For icon-only buttons pass `aria-label`. */
  label: string;
  size?: ButtonSize | undefined;
  variant?: ButtonVariant | undefined;
  /** Shrink to content width instead of filling the container. */
  isCompact?: boolean | undefined;
  /** Decorative icon before the label (hidden from assistive technology). */
  startIcon?: ReactNode;
  /** Decorative icon after the label (hidden from assistive technology). */
  endIcon?: ReactNode;
  /**
   * An action is in flight: shows a spinner, ignores further activation and
   * sets aria-disabled while keeping focus (unlike `disabled`).
   */
  isPending?: boolean | undefined;
  /** Label while pending (e.g. "Saving…"); defaults to `label`. */
  pendingLabel?: string | undefined;
};
