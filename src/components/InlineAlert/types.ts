import type { ReactNode } from 'react';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

export type Props = {
  tone?: AlertTone | undefined;
  /** Short heading (optional). */
  title?: string | undefined;
  children?: ReactNode;
  /** Actions such as a retry button. */
  actions?: ReactNode;
  /**
   * Live-region role. Defaults to "alert" for errors (announced immediately)
   * and "status" otherwise. Use "none" for static, non-announced notes.
   */
  role?: 'alert' | 'status' | 'none' | undefined;
  id?: string | undefined;
};
