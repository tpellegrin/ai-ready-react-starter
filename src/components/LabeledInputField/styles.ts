import { styled } from 'styled-components';

export const _LabeledInputFieldDivider = styled.div`
  flex: 1 1 auto;
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.colors.surface.divider};
`;
