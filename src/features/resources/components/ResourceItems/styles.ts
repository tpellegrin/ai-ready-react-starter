import { styled } from 'styled-components';

export const _ResourceItemsList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const _ResourceItemsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacers.sm};
`;

export const _ResourceItemsMeta = styled.p`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacers.xs};
  margin: 0;
`;

export const _ResourceItemsBadge = styled.span`
  padding: 0 ${({ theme }) => theme.spacers.xs};
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: ${({ theme }) => theme.colors.surface.raised};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  line-height: 1.6;
`;

export const _ResourceItemsActions = styled.div`
  display: flex;
  flex: 0 0 auto;
  gap: ${({ theme }) => theme.spacers.xs};
`;
