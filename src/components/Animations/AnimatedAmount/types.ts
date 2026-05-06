import { ComponentPropsWithoutRef } from 'react';

import { TextVariant, TextAlign, TextColor } from 'components/Text/types';
import { Locale } from 'i18n';

import { EasingName } from './logic';

export type AnimatedAmountFormat = 'currency' | 'number';

export type Props = {
  value: number;
  initialValue?: number;
  durationMs?: number;
  easing?: EasingName;
  animateOnChange?: boolean;
  allowMotionOverride?: boolean;
  onDone?: (finalValue: number) => void;
  format?: AnimatedAmountFormat;
  currency?: string;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
  locale?: Locale;
  formatter?: (value: number, locale: string) => string;
  variant?: TextVariant;
  align?: TextAlign;
  color?: TextColor;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'span'>, 'children'>;
