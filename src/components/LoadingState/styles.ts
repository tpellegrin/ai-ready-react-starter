import { styled } from 'styled-components';

export const _LoadingStateRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacers.sm};
  padding: ${({ theme }) => theme.spacers.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;
