import { styled } from 'styled-components';

import { from } from 'styles/media';

/** Internal: named _<Component><Part>, theme tokens only. */
export const _ExpenseSummaryRoot = styled.section`
  width: 100%;
`;

export const _ExpenseSummaryList = styled.ul`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacers.md};
  margin: 0;
  padding: 0;
  list-style: none;

  /* One tile per row on phones, the three side by side above. */
  ${from.tabletPortrait} {
    grid-template-columns: repeat(3, 1fr);
  }
`;
