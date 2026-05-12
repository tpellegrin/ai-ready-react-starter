import { styled } from 'styled-components';

import { fillParent } from 'styles/mixins';

export const _LayoutTransitionContainerRoot = styled.div`
  ${fillParent};

  width: 100%;
  position: relative;

  /* Let enter/exit overlays and center slides render edge-to-edge */
  overflow: visible;
`;

export const _LayoutTransitionContainerInner = styled.div`
  ${fillParent};

  display: flex;
  justify-content: flex-start;
  width: 100%;
`;
