import React, { useCallback, useRef } from 'react';

import { ensureHttpUrl } from 'utils/links';
import { assignRef } from 'utils/react';

import { isButtonProps, isAnchorProps } from './logic';
import { _ButtonBaseRoot } from './styles';
import { Props, AnchorProps, ButtonProps } from './types';

export const ButtonBase = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  Props
>((props, ref) => {
  const localRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const setRef = (node: HTMLButtonElement | HTMLAnchorElement | null) => {
    localRef.current = node;
    assignRef(ref, node);
  };

  const {
    blurDelay = 0,
    blurOnClick,
    disabled,
    stopPropagation,
    onClick,
    isFullWidth,
    ...rest
  } = props;

  const handleOnClick = useCallback(
    (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.MouseEvent<HTMLAnchorElement>,
    ) => {
      if (stopPropagation) event.stopPropagation();

      if (blurOnClick) {
        setTimeout(() => {
          localRef.current?.blur();
        }, blurDelay);
      }

      if (disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      onClick?.(event);
    },
    [stopPropagation, blurOnClick, blurDelay, disabled, onClick],
  );

  if (isAnchorProps(props)) {
    const { href, rel, target, tabIndex, ...anchorRest } = rest as AnchorProps;
    const safeRel = target === '_blank' ? (rel ?? 'noreferrer noopener') : rel;

    return (
      <_ButtonBaseRoot
        as="a"
        ref={setRef as (n: HTMLAnchorElement | null) => void}
        {...anchorRest}
        href={ensureHttpUrl(href)}
        rel={safeRel}
        target={target}
        onClick={handleOnClick}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : tabIndex}
        $isDisabled={!!disabled}
        $isFullWidth={isFullWidth}
      />
    );
  }

  if (isButtonProps(props)) {
    const { type, ...buttonRest } = rest as ButtonProps;

    return (
      <_ButtonBaseRoot
        as="button"
        ref={setRef as (n: HTMLButtonElement | null) => void}
        {...buttonRest}
        type={type ?? 'button'}
        onClick={handleOnClick}
        disabled={!!disabled}
        aria-disabled={disabled || undefined}
        $isDisabled={!!disabled}
        $isFullWidth={isFullWidth}
      />
    );
  }

  throw new Error(
    'ButtonBase mode not recognized. Pass one of: href (anchor), or onClick/type (button).',
  );
});

ButtonBase.displayName = 'ButtonBase';
