import { styled } from 'styled-components';

import type { AlertTone } from './types';

export const _InlineAlertRoot = styled.div<{ $tone: AlertTone }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xs};
  width: 100%;
  padding: ${({ theme }) => theme.spacers.sm} ${({ theme }) => theme.spacers.md};
  border: 0.0625rem solid
    ${({ theme, $tone }) => theme.colors.feedback[$tone].border};
  border-left-width: 0.25rem;
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme, $tone }) => theme.colors.feedback[$tone].surface};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const _InlineAlertActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacers.xs};
  margin-top: ${({ theme }) => theme.spacers.xxs};
`;
