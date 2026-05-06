import { styled } from 'styled-components';

export const _LayoutPositionAnimatorRoot = styled.div`
  /* Host element is intentionally minimal. All motion/timing is provided via
     CSS variables and the global clamp through data-allow-* attributes. */
  position: relative;
  width: 100%;
`;
