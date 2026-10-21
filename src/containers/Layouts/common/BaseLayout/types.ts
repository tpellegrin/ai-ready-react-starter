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

import { type ReactNode } from 'react';
import { type SpaceColorKeys } from 'styles/colors';
import { type Theme } from 'styles/themes/types';

export interface Props {
  children: ReactNode;
  backgroundColor?: SpaceColorKeys<'surface'> | undefined;
  gradient?: keyof Theme['gradients'] | undefined;
  header?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  stickyHeader?: boolean | undefined;
  fixedFooter?: boolean | undefined;
  contentClassName?: string | undefined;
}
