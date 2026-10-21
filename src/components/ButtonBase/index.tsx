import { useCallback, useRef, type MouseEvent } from 'react';

import { assignRef } from 'utils/react';

import { _ButtonBaseRoot } from './styles';
import type { Props } from './types';

export const ButtonBase = ({
  ref,
  type = 'button',
  blurDelay = 0,
  blurOnClick,
  stopPropagation,
  isFullWidth,
  onClick,
  ...rest
}: Props) => {
  const localRef = useRef<HTMLButtonElement | null>(null);

  const setRef = useCallback(
    (node: HTMLButtonElement | null) => {
      localRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (stopPropagation) event.stopPropagation();
      if (blurOnClick) {
        window.setTimeout(() => localRef.current?.blur(), blurDelay);
      }
      onClick?.(event);
    },
    [stopPropagation, blurOnClick, blurDelay, onClick],
  );

  return (
    <_ButtonBaseRoot
      {...rest}
      ref={setRef}
      type={type}
      onClick={handleClick}
      $isFullWidth={isFullWidth}
    />
  );
};

ButtonBase.displayName = 'ButtonBase';

export type { Props as ButtonBaseProps } from './types';
