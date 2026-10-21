import { styled } from 'styled-components';

export const ___Feature__PanelRoot = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

export const ___Feature__PanelList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xs};
  margin: 0;
  padding: 0;
  list-style: none;
`;
