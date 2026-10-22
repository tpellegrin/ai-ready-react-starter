import { styled } from 'styled-components';

/** Intro text and the add action share a row, wrapping on narrow screens. */
export const _ExpensesIntro = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacers.sm};
`;
