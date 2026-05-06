import { styled, css } from 'styled-components';

import { typography } from 'styles/themes/typography';
import { onlyHoverDevice } from 'styles/media';

export type ControlSize = 'small' | 'medium';
export type ControlStatus = 'default' | 'error' | 'success' | 'loading';

export const _ControlBackground = styled.div<{
  $disabled?: boolean;
  $noBorder?: boolean;
}>`
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  border: ${({ $noBorder }) =>
    $noBorder ? 'none' : '0.0625rem solid var(--control-border-color)'};
  background-color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.action.disabled : 'var(--control-bg)'};
  transition:
    box-shadow 150ms ease-in,
    border-color 150ms ease-in,
    background-color 150ms ease-in;
`;

export const _ControlContent = styled.div<{ $alignStart?: boolean }>`
  display: flex;
  align-items: ${({ $alignStart }) => ($alignStart ? 'flex-start' : 'center')};
  position: relative;

  & > *:not(${/* sc-selector */ _ControlBackground}) {
    position: relative;
    z-index: 2;
  }
`;

export const _ControlRoot = styled.label<{
  $size: ControlSize;
  $status: ControlStatus;
  $isDisabled?: boolean;
  $noBorder?: boolean;
}>`
  --control-border-color: ${({ theme }) => theme.colors.border.default};
  --control-bg: ${({ theme }) => theme.colors.action.secondary};

  display: block;
  position: relative;
  width: 100%;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: text;

  ${({ $isDisabled, theme }) =>
    $isDisabled &&
    css`
      pointer-events: none;
      color: ${theme.colors.text.tertiary};
      cursor: default;
    `}

  ${({ $status, theme }) =>
    $status === 'error' &&
    css`
      --control-border-color: ${theme.colors.status.error};
    `}
  ${({ $status, theme }) =>
    $status === 'success' &&
    css`
      --control-border-color: ${theme.colors.status.success};
    `}

  &:focus-within ${/* sc-selector */ _ControlBackground} {
    border-color: var(--control-border-color);
    box-shadow: ${({ theme }) => theme.shadows.interactionStates.focus};
  }

  ${onlyHoverDevice} {
    &:hover ${/* sc-selector */ _ControlBackground} {
      box-shadow: ${({ theme }) => theme.shadows.interactionStates.hover};
    }
  }
`;

export const _ControlAdornment = styled.div<{ position: 'start' | 'end' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacers.xs};
  flex: 0 0 auto;

  & > * {
    pointer-events: none;
  }

  ${({ position, theme }) =>
    position === 'start'
      ? `margin-right: ${theme.spacers.xs};`
      : `margin-left: ${theme.spacers.xs};`}
`;

export const _ControlSuffix = styled.div`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  margin-left: ${({ theme }) => theme.spacers.xs};

  & > * {
    pointer-events: none;
  }
`;

export const _ControlField = styled.input<{
  $size: ControlSize;
  $multiline?: boolean;
  $visuallyHidden?: boolean;
}>`
  margin: 0;
  padding: 0 0.75rem;
  outline: 0;
  border: 0;
  flex: 1 1 100%;
  min-width: 0;
  background: none;
  appearance: none;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: inherit;

  /* Remove native spin buttons in Chrome, Safari, Edge (WebKit/Blink) */
  &[type='number']::-webkit-outer-spin-button,
  &[type='number']::-webkit-inner-spin-button {
    margin: 0;
    appearance: none;
  }

  /* Remove native spin buttons in Firefox */
  &[type='number'] {
    appearance: textfield;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.disabled};
    opacity: 1;
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  ${({ $size, $multiline }) =>
    $multiline
      ? css`
          ${typography.bodyMd};
          resize: none;
          line-height: 1.4;
          min-height: 3.25rem;
        `
      : $size === 'small'
        ? css`
            ${typography.bodyMd};
            height: 1.25rem;
          `
        : css`
            ${typography.headingSm};
            height: 2.375rem;
          `}

  &:active ~ ${/* sc-selector */ _ControlBackground} {
    border-color: var(--control-border-color);
    box-shadow: ${({ theme }) => theme.shadows.interactionStates.focus};
  }

  ${({ $visuallyHidden }) =>
    $visuallyHidden &&
    css`
      position: absolute !important;
      width: 0.0625rem;
      height: 0.0625rem;
      padding: 0;
      margin: -0.0625rem;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `}
`;
