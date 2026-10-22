import { styled } from 'styled-components';

export const ___Name__Root = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.lg} ${({ theme }) => theme.spacers.md};
`;
