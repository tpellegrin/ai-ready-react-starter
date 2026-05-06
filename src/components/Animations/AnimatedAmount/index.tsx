import * as React from 'react';

import { Text } from 'components/Text';

import { useI18n } from 'i18n/provider';

import { useAnimatedNumber } from './logic';
import { Props } from './types';
import { formatAnimatedAmount } from './util';

export const AnimatedAmount: React.FC<Props> = React.memo(
  ({
    value,
    initialValue,
    durationMs,
    easing,
    animateOnChange = true,
    allowMotionOverride,
    onDone,
    format = 'currency',
    currency,
    maximumFractionDigits,
    useGrouping = true,
    locale: localeProp,
    formatter,
    variant = 'bodyMd',
    align,
    color,
    className,
    ...rest
  }) => {
    const { lang } = useI18n();
    const locale = localeProp ?? lang;

    const animatedValue = useAnimatedNumber({
      value,
      initialValue,
      durationMs,
      easing,
      animateOnChange,
      allowMotionOverride,
      onDone,
    });

    const formatted = formatAnimatedAmount(animatedValue, {
      format,
      currency,
      maximumFractionDigits,
      useGrouping,
      locale,
      formatter,
    });

    return (
      <Text
        as="span"
        variant={variant}
        align={align}
        color={color}
        className={className}
        numeric="tabular"
        {...rest}
      >
        {formatted}
      </Text>
    );
  },
);
