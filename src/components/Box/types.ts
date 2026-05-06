import type React from 'react';

import { Theme } from 'styles/themes/types';
import { SpaceColorKeys } from 'utils/colors';

export type Props = React.HTMLAttributes<HTMLDivElement> & {
  borderColor?: SpaceColorKeys<'border'>;
  backgroundColor?: SpaceColorKeys<'surface'>;
  color?: SpaceColorKeys<'text'>;
  borderRadius?: keyof Theme['borderRadii'];
  gradient?: keyof Theme['gradients'];
  elevation?: keyof Theme['shadows']['elevation'];
  px?: keyof Theme['spacers'];
  py?: keyof Theme['spacers'];
  pxDesktop?: keyof Theme['spacers'];
  pyDesktop?: keyof Theme['spacers'];
  children?: React.ReactNode;
  className?: string;
};
