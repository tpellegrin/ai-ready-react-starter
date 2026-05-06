import React, { useMemo } from 'react';

import { Text } from 'components/Text';
import { _ButtonRoot, TRANSITION_MS } from './styles';
import type { Props } from './types';

import type { Props as ButtonBaseProps } from 'components/ButtonBase/types';

export const Button: React.FC<Props> = ({
  size = 'medium',
  variant = 'primary',
  isCompact = false,
  // Icon props kept for future parity with Design System
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startIconName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endIconName,
  label,
  ...baseProps
}) => {
  const textVariant = useMemo<
    NonNullable<React.ComponentProps<typeof Text>['variant']>
  >(() => {
    if (size === 'medium') return 'bodyMdBold';
    return 'captionMdBold';
  }, [size]);

  return (
    <_ButtonRoot
      {...(baseProps as ButtonBaseProps)}
      $size={size}
      $variant={variant}
      $isCompact={isCompact}
      $isDisabled={!!(baseProps as ButtonBaseProps).disabled}
      blurDelay={TRANSITION_MS}
    >
      <Text as="span" variant={textVariant} truncate>
        {label}
      </Text>
    </_ButtonRoot>
  );
};

Button.displayName = 'Button';
