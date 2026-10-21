import { styled } from 'styled-components';

export const _ResourceCatalogRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

export const _ResourceCatalogToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacers.sm};
`;

export const _ResourceCatalogFilter = styled.div`
  width: 100%;
  max-width: 14rem;
`;

export const _ResourceCatalogPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
`;
