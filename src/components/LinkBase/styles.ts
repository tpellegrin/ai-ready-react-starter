import { Link } from 'react-router-dom';
import { styled, css } from 'styled-components';

import { focusRing } from 'styles/mixins';

const linkBaseStyles = css<{ $isFullWidth?: boolean | undefined }>`
  display: inline-flex;
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.borderRadii.xs};
  background: transparent;
  color: inherit;
  text-decoration: inherit;
  cursor: pointer;

  &:focus-visible {
    ${focusRing};
  }

  ${({ $isFullWidth }) =>
    $isFullWidth &&
    css`
      display: flex;
      width: 100%;
    `}
`;

export const _LinkBaseAnchor = styled.a<{ $isFullWidth?: boolean | undefined }>`
  ${linkBaseStyles}
`;

export const _LinkBaseRouterLink = styled(Link)<{
  $isFullWidth?: boolean | undefined;
}>`
  ${linkBaseStyles}
`;
