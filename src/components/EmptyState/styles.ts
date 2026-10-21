import { styled } from 'styled-components';

export const _EmptyStateRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacers.sm};
  padding: ${({ theme }) => theme.spacers.xl} ${({ theme }) => theme.spacers.md};
  text-align: center;
`;
