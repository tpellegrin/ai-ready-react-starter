import { styled } from 'styled-components';

export const _SessionUnavailableContent = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
  max-width: 30rem;
  padding: ${({ theme }) => theme.spacers.md};
`;
