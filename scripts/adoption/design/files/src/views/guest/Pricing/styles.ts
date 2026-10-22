import { styled } from 'styled-components';

import { Box } from 'components/Box';
import { Text } from 'components/Text';
import { from } from 'styles/media';

export const _PricingBrand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacers.xs};
`;

/** Decorative brand mark (there is no logo asset). */
export const _PricingMark = styled.span`
  width: ${({ theme }) => theme.spacers.lg};
  height: ${({ theme }) => theme.spacers.lg};
  border-radius: ${({ theme }) => theme.borderRadii.xs};
  background: ${({ theme }) => theme.colors.action.accent};
`;

export const _PricingContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxl};
  width: 100%;
  max-width: 68rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.xxl}
    ${({ theme }) => theme.spacers.md};
`;

export const _PricingHero = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  max-width: 44rem;
  margin: 0 auto;

  & > * {
    margin: 0;
  }
`;

export const _PricingBilling = styled.div`
  align-self: center;
`;

/** One column on narrow screens, three side by side where they fit. */
export const _PricingPlans = styled.ul`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacers.xl};
  margin: 0;
  padding: 0;
  list-style: none;

  ${from.tabletLandscape} {
    grid-template-columns: repeat(3, 1fr);
  }

  & > li,
  & article {
    height: 100%;
  }
`;

export const _PricingCard = styled(Box)<{ $popular: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
  height: 100%;
  border-width: ${({ $popular }) => ($popular ? '2px' : '1px')};
  border-color: ${({ theme, $popular }) =>
    $popular ? theme.colors.action.accent : theme.colors.border.default};

  & h2 {
    margin: 0;
  }
`;

/** "Most popular", over the card's top border. */
export const _PricingBadge = styled(Text)`
  position: absolute;
  top: 0;
  left: ${({ theme }) => theme.spacers.lg};
  padding: ${({ theme }) => theme.spacers.xxxs}
    ${({ theme }) => theme.spacers.sm};
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: ${({ theme }) => theme.colors.action.accent};
  color: ${({ theme }) => theme.colors.text.onDarkPrimary};
  transform: translateY(-50%);
`;

export const _PricingPrice = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacers.xs};
  margin: ${({ theme }) => theme.spacers.sm} 0 0;
`;

export const _PricingFeatures = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.sm};
  margin: ${({ theme }) => theme.spacers.sm} 0 0;
  padding: ${({ theme }) => theme.spacers.lg} 0 0;
  border-top: 1px solid ${({ theme }) => theme.colors.surface.divider};
  list-style: none;

  & > li {
    display: flex;
    gap: ${({ theme }) => theme.spacers.xs};
  }
`;

export const _PricingCheck = styled.span`
  color: ${({ theme }) => theme.colors.action.accent};
  font-weight: ${({ theme }) => theme.fontWeights.primary.semiBold};
`;
