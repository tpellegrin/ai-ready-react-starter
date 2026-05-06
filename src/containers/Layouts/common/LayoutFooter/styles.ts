import { styled } from 'styled-components';

export const _LayoutFooterRoot = styled.footer`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  background: ${({ theme }) => theme.colors.surface.base};
  width: 100%;
  z-index: ${({ theme }) => theme.zIndexes.footer};
`;
