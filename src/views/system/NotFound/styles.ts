import { styled } from 'styled-components';

/** Page landmark: Not Found renders outside the page layouts. */
export const _NotFoundRoot = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacers.md};
  height: 100%;
  padding: ${({ theme }) => theme.spacers.md};
  text-align: center;
`;
