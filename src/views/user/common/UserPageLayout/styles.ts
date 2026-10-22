import { NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import { from } from 'styles/media';
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
  display: inline-flex;
  align-items: center;

  /* WCAG 2.2 minimum target size (24px), also on narrow screens. */
  min-height: 1.5rem;
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

export const _UserPageLayoutToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacers.xs};
  padding: 0 ${({ theme }) => theme.spacers.md}
    ${({ theme }) => theme.spacers.xs};

  ${from.tablet} {
    padding-inline: ${({ theme }) => theme.spacers.xxl};
  }
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
