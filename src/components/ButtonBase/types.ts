import type { ButtonHTMLAttributes, Ref } from 'react';

/**
 * Unstyled native <button>. Buttons perform actions; use LinkBase for
 * navigation (an element that changes the URL must be a link).
 */
export type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement> | undefined;
  /** Blur after click (e.g. toolbar buttons that should not keep focus). */
  blurOnClick?: boolean | undefined;
  /** Delay before blurring, in ms. */
  blurDelay?: number | undefined;
  stopPropagation?: boolean | undefined;
  isFullWidth?: boolean | undefined;
};
