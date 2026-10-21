import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { focusRing } from 'styles/mixins';

export const _UserPageLayoutNavList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacers.sm};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const _UserPageLayoutNavLink = styled(NavLink)`
  padding: ${({ theme }) => theme.spacers.xxs}
    ${({ theme }) => theme.spacers.xs};
  border-radius: ${({ theme }) => theme.borderRadii.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &[aria-current='page'] {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }

  &:focus-visible {
    ${focusRing};
  }
`;

export const _UserPageLayoutActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacers.xs};
`;

export const _UserPageLayoutContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.lg};
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.lg} ${({ theme }) => theme.spacers.md};
`;
