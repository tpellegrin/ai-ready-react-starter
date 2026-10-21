import { styled } from 'styled-components';

export const _ErrorPageRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  padding: ${({ theme }) => theme.spacers.lg};
`;

export const _ErrorPageDetails = styled.pre`
  margin: 0;
  padding: ${({ theme }) => theme.spacers.sm};
  overflow: auto;
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme }) => theme.colors.surface.muted};
  color: ${({ theme }) => theme.colors.text.emphasis};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  white-space: pre-wrap;
`;
