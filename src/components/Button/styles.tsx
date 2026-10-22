import { styled, css } from 'styled-components';

import { ButtonBase } from 'components/ButtonBase';
import { Text } from 'components/Text';
import { onlyHoverDevice } from 'styles/media';
import type { Props } from './types';

export const TRANSITION_MS = 150;

/** The label composes the public Text component (typography, truncation). */
export const _ButtonLabel = styled(Text)`
  margin: 0;
  color: inherit;
`;

export const _ButtonIcon = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  line-height: 0;
`;

export const _ButtonRoot = styled(ButtonBase)<{
  $variant: Props['variant'];
  $size: Props['size'];
  $isCompact: boolean;
  $isDisabled: boolean;
  $isPending: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    ${TRANSITION_MS}ms box-shadow ease-in,
    ${TRANSITION_MS}ms border-color ease-in,
    ${TRANSITION_MS}ms background-color ease-in,
    ${TRANSITION_MS}ms color ease-in;
  gap: ${({ theme }) => theme.spacers.xs};
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadii.full};
  position: relative;
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.action.secondary};

  &::after {
    position: absolute;
    inset: 0;
    border-radius: ${({ theme }) => theme.borderRadii.full};
    opacity: 0;
    transition: ${TRANSITION_MS}ms opacity ease-in;
    content: '';
    pointer-events: none;
  }

  ${onlyHoverDevice} {
    &:hover {
      box-shadow: ${({ theme }) => theme.shadows.interactionStates.hover};
    }
  }

  &:active {
    box-shadow: ${({ theme }) => theme.shadows.interactionStates.active};

    &::after {
      opacity: 1;
    }
  }

  ${({ $isPending }) =>
    $isPending &&
    css`
      cursor: progress;
    `}

  ${({ $isCompact }) =>
    $isCompact &&
    css`
      width: fit-content;
    `}

  ${({ $isDisabled, theme }) =>
    $isDisabled &&
    css`
      color: ${theme.colors.text.tertiary};
      background-color: ${theme.colors.action.disabled};
    `}

  ${({ $isDisabled, $variant, theme }) =>
    !$isDisabled &&
    $variant === 'primary' &&
    css`
      color: ${theme.colors.text.onDarkPrimary};
      background-color: ${theme.colors.action.primary};

      &::after {
        background: ${theme.colors.surface.glowOnDark};
      }
    `}

  ${({ $isDisabled, $variant, theme }) =>
    !$isDisabled &&
    $variant === 'secondary' &&
    css`
      color: ${theme.colors.text.primary};
      background-color: ${theme.colors.action.secondary};

      &::after {
        background: ${theme.colors.surface.glow};
      }
    `}

  ${({ $isDisabled, $variant, theme }) =>
    !$isDisabled &&
    $variant === 'tertiary' &&
    css`
      color: ${theme.colors.text.primary};
      background-color: ${theme.colors.action.tertiary};

      &::after {
        background: ${theme.colors.surface.glow};
      }
    `}

  ${({ $isDisabled, $variant, theme }) =>
    !$isDisabled &&
    $variant === 'accent' &&
    css`
      color: ${theme.colors.text.onDarkPrimary};
      background-color: ${theme.colors.action.accent};

      &::after {
        background: ${theme.colors.surface.glowOnDark};
      }
    `}

  ${({ $size, theme }) =>
    $size === 'small' &&
    css`
      min-height: ${theme.spacers.xxl};
      padding: ${theme.spacers.xs} ${theme.spacers.md};
    `}

  ${({ $size, theme }) =>
    $size === 'smallTight' &&
    css`
      min-height: ${theme.spacers.xxl};
      padding: ${theme.spacers.xs} ${theme.spacers.xs};
    `}

  ${({ $size, theme }) =>
    $size === 'medium' &&
    css`
      min-height: calc(${theme.spacers.xxl} + ${theme.spacers.xs});
      padding: ${theme.spacers.md};
    `}
`;
