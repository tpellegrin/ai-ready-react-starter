import { Link } from 'react-router-dom';
import styled from 'styled-components';

export const _DemoHubPage = styled.div`
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.lg} ${({ theme }) => theme.spacers.md};
  box-sizing: border-box;
`;

export const _DemoHubBadge = styled.span`
  align-self: flex-start;
  padding: ${({ theme }) => theme.spacers.xxs}
    ${({ theme }) => theme.spacers.sm};
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme }) => theme.colors.surface.muted};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${({ theme }) => theme.fontFamilies.primary};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const _DemoHubEntryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

export const _DemoHubEntryLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: ${({ theme }) => theme.borderRadii.md};

  &:focus-visible {
    outline: 0.125rem solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 0.125rem;
  }
`;
