/**
 * BaseLayout public API
 *
 * A canonical page scaffold used across the app.
 * - Provides a scrollable main area with background color/gradient.
 * - Optional header (can be sticky within the scroll container).
 * - Optional footer (inline or fixed to the viewport; when fixed, the layout auto-pads).
 * - _LayoutHeaderContent container exposes width and padding controls.
 *
 * Notes:
 * - Prefer `gradient` over `backgroundColor` when both are provided (gradient wins).
 * - Safe-area insets are respected when a fixed footer is used.
 * - This component is presentation-only; it does not manage routing or data.
 */

import { ReactNode } from 'react';
import { SpaceColorKeys } from 'utils/colors';
import { Theme } from 'styles/themes/types';

export interface Props {
  children: ReactNode;
  backgroundColor?: SpaceColorKeys<'surface'>;
  gradient?: keyof Theme['gradients'];
  header?: ReactNode;
  footer?: ReactNode;
  stickyHeader?: boolean;
  fixedFooter?: boolean;
  /**
   * @deprecated Apply paddings on the inner wrapper (LayoutTransitionContainer) using scrollerInner.
   */
  paddingBlock?: string;
  /**
   * @deprecated Apply paddings on the inner wrapper (LayoutTransitionContainer) using scrollerInner.
   */
  paddingInline?: string;
  contentClassName?: string;
}
