import { styled } from 'styled-components';

export const _ResourceFormRoot = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
`;

export const _ResourceFormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacers.xs};
`;
