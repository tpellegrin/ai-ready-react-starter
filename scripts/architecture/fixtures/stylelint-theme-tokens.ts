// @fixture-path src/views/__arch__/Notice/styles.ts
// @lint stylelint
// @expect none
// Theme tokens, color keywords and structural values are fine.
import { styled } from 'styled-components';

export const _NoticeRoot = styled.div`
  max-width: 40rem;
  padding: ${({ theme }) => theme.spacers.md};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  outline-color: transparent;
  background: ${({ theme }) => theme.colors.surface.raised};
  color: currentcolor;
  transition: opacity 150ms ease-in;
`;
