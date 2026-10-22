// @fixture-path src/views/__arch__/Profile/styles.ts
// @expect none
// A local wrapper may extend a public component; names carry the owner.
import { styled } from 'styled-components';

import { ArchFixtureWidget } from 'components/ArchFixtureWidget';

export const _ProfileRoot = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacers.md};
`;

export const _ProfileCard = styled(ArchFixtureWidget)`
  max-width: 40rem;
`;
