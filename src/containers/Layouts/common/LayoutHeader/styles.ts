import { styled } from 'styled-components';

import { from } from 'styles/media';

export const LAYOUT_HEADER_HEIGHT = '4.5rem';

export const _LayoutHeaderRoot = styled.header`
  padding-top: env(safe-area-inset-top);
  width: 100%;
  z-index: ${({ theme }) => theme.zIndexes.header};
  background: ${({ theme }) => theme.gradients.headerBackground};
`;

export const _LayoutHeaderContent = styled.div`
  height: ${LAYOUT_HEADER_HEIGHT};
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: ${({ theme }) => theme.spacers.xs};
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-inline: ${({ theme }) => theme.spacers.md};
  padding-top: calc(
    max(${({ theme }) => theme.spacers.md} - env(safe-area-inset-top), 0)
  );

  ${from.tablet} {
    padding-inline: ${({ theme }) => theme.spacers.xxl};
  }
`;
