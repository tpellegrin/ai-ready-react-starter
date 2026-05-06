import { styled, css } from 'styled-components';

export const _LinkBaseRoot = styled.a<{
  $isDisabled?: boolean;
  $isFullWidth?: boolean;
}>`
  background: transparent;
  color: inherit;
  text-decoration: inherit;
  border: 0;
  outline: none;
  margin: 0;
  padding: 0;
  display: inline-flex;
  align-items: unset;
  justify-content: unset;
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
