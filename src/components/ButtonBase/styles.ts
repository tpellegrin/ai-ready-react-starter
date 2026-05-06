import { styled, css } from 'styled-components';

export const _ButtonBaseRoot = styled.button<{
  $isDisabled?: boolean;
  $isFullWidth?: boolean;
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
  text-align: unset;
  line-height: inherit;
  -webkit-touch-callout: none;
  user-select: none;
  cursor: pointer;

  &:focus-visible {
    outline: none;
  }

  ${({ $isFullWidth }) =>
    $isFullWidth &&
    css`
      width: 100%;
      display: flex;
    `}

  ${({ $isDisabled }) =>
    $isDisabled &&
    css`
      cursor: not-allowed;
      pointer-events: none;
    `}
`;
