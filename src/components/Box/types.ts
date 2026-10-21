import type React from 'react';

import { type Theme } from 'styles/themes/types';
import { type SpaceColorKeys } from 'styles/colors';

export type Props = React.HTMLAttributes<HTMLDivElement> & {
  borderColor?: SpaceColorKeys<'border'> | undefined;
  backgroundColor?: SpaceColorKeys<'surface'> | undefined;
  color?: SpaceColorKeys<'text'> | undefined;
  borderRadius?: keyof Theme['borderRadii'] | undefined;
  gradient?: keyof Theme['gradients'] | undefined;
  elevation?: keyof Theme['shadows']['elevation'] | undefined;
  px?: keyof Theme['spacers'] | undefined;
  py?: keyof Theme['spacers'] | undefined;
  pxDesktop?: keyof Theme['spacers'] | undefined;
  pyDesktop?: keyof Theme['spacers'] | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
};
