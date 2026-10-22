import type { MouseEvent } from 'react';

import { Spinner } from 'components/Spinner';

import { _ButtonIcon, _ButtonLabel, _ButtonRoot } from './styles';
import type { Props } from './types';

export const Button = ({
  size = 'medium',
  variant = 'primary',
  isCompact = false,
  label,
  startIcon,
  endIcon,
  disabled,
  isPending = false,
  pendingLabel,
  onClick,
  ...baseProps
}: Props) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Pending buttons stay focusable but must not submit or act twice.
    if (isPending) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const leading = isPending ? <Spinner /> : startIcon;

  return (
    <_ButtonRoot
      {...baseProps}
      disabled={disabled}
      aria-disabled={isPending || undefined}
      onClick={handleClick}
      $size={size}
      $variant={variant}
      $isCompact={isCompact}
      $isDisabled={!!disabled}
      $isPending={isPending}
    >
      {leading ? <_ButtonIcon aria-hidden="true">{leading}</_ButtonIcon> : null}
      <_ButtonLabel
        forwardedAs="span"
        variant={size === 'medium' ? 'bodyMdBold' : 'captionMdBold'}
        truncate
      >
        {isPending ? (pendingLabel ?? label) : label}
      </_ButtonLabel>
      {endIcon ? <_ButtonIcon aria-hidden="true">{endIcon}</_ButtonIcon> : null}
    </_ButtonRoot>
  );
};

Button.displayName = 'Button';
