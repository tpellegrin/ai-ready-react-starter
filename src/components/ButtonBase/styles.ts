import { styled, css } from 'styled-components';

import { focusRing } from 'styles/mixins';

export const _ButtonBaseRoot = styled.button<{
  $isFullWidth?: boolean | undefined;
}>`
  display: inline-flex;
  align-items: unset;
  justify-content: unset;
  padding: 0;
  margin: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: unset;
  line-height: inherit;
  -webkit-touch-callout: none;
  user-select: none;
  cursor: pointer;

  &:focus-visible {
    ${focusRing};
  }

  &:disabled,
  &[aria-disabled='true'] {
    cursor: not-allowed;
  }

  ${({ $isFullWidth }) =>
    $isFullWidth &&
    css`
      width: 100%;
      display: flex;
    `}
`;
