import type { ComponentPropsWithoutRef } from 'react';

import {
  _LayoutTransitionContainerInner,
  _LayoutTransitionContainerRoot,
} from './styles';

type Props = ComponentPropsWithoutRef<'div'>;

/**
 * Fills the layout's content area so route transitions can overlay pages
 * edge to edge (MainLayout, FlowLayout).
 */
export const LayoutTransitionContainer = ({ children, ...rest }: Props) => (
  <_LayoutTransitionContainerRoot {...rest}>
    {children}
  </_LayoutTransitionContainerRoot>
);

/** Row wrapper inside the container, for layouts with a fixed banner. */
export const LayoutTransitionContainerInner = ({ children }: Props) => (
  <_LayoutTransitionContainerInner>{children}</_LayoutTransitionContainerInner>
);
