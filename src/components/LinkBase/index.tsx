import React, { forwardRef, useCallback, useRef } from 'react';

import { ensureHttpUrl } from 'utils/links';
import { assignRef } from 'utils/react';

import { _LinkBaseRoot } from './styles';
import type { Props } from './types';

export const LinkBase = forwardRef<HTMLAnchorElement, Props>(
  (
    {
      blurDelay = 0,
      blurOnClick,
      disabled,
      stopPropagation,
      onClick,
      isFullWidth,
      target,
      rel,
      href,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const localRef = useRef<HTMLAnchorElement | null>(null);

    const handleOnClick = useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (stopPropagation) event.stopPropagation();

        if (blurOnClick) {
          setTimeout(() => localRef.current?.blur(), blurDelay);
        }

        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      },
      [stopPropagation, blurOnClick, disabled, onClick, blurDelay],
    );

    const safeRel = target === '_blank' ? (rel ?? 'noreferrer noopener') : rel;

    return (
      <_LinkBaseRoot
        ref={(node) => {
          localRef.current = node;
          assignRef(ref, node);
        }}
        className={className}
        href={ensureHttpUrl(href)}
        target={target}
        rel={safeRel}
        onClick={handleOnClick}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
        $isDisabled={!!disabled}
        $isFullWidth={isFullWidth}
        {...rest}
      >
        {children}
      </_LinkBaseRoot>
    );
  },
);

LinkBase.displayName = 'LinkBase';
