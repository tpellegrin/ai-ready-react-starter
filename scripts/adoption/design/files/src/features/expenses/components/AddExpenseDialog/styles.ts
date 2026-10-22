import { styled } from 'styled-components';

/** Internal: named _<Component><Part>, theme tokens only. */
export const _AddExpenseDialogForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
`;
