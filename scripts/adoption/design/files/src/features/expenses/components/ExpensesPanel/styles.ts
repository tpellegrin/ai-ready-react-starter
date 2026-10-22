import { styled } from 'styled-components';

import { Text } from 'components/Text';

import type { ExpenseStatus } from '../../model';

/** Internal: named _<Component><Part>, theme tokens only. */
export const _ExpensesPanelRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

export const _ExpensesPanelFilter = styled.div`
  width: 100%;
  max-width: 12rem;
`;

export const _ExpensesPanelPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
`;

export const _ExpensesPanelList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
  margin: 0;
  padding: 0;
  list-style: none;
`;

/** Description and details on one side, amount and status on the other. */
export const _ExpensesPanelRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacers.xs} ${({ theme }) => theme.spacers.md};
`;

/** Description with its category and date right under it. */
export const _ExpensesPanelDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxs};

  & > * {
    margin: 0;
  }
`;

export const _ExpensesPanelAmount = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacers.xxs};
`;

/** The status as a pill, in the feedback colors of its meaning. */
export const _ExpensesPanelStatus = styled(Text)<{ $status: ExpenseStatus }>`
  padding: 0 ${({ theme }) => theme.spacers.xs};
  border: 1px solid
    ${({ theme, $status }) =>
      theme.colors.feedback[$status === 'approved' ? 'success' : 'warning']
        .border};
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: ${({ theme, $status }) =>
    theme.colors.feedback[$status === 'approved' ? 'success' : 'warning']
      .surface};
  color: ${({ theme, $status }) =>
    theme.colors.feedback[$status === 'approved' ? 'success' : 'warning'].text};
`;
