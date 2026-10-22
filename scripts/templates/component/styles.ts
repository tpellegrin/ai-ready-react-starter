import { styled } from 'styled-components';

/** Internal: named _<Component><Part>, theme tokens only. */
export const ___Name__Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
`;
