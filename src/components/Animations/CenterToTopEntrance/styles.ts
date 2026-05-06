import { styled } from 'styled-components';

export const _CenterToTopEntranceRoot = styled.div`
  position: relative;
  width: 100%;
  height: auto;
`;

export const _CenterToTopEntranceStatic = styled.div<{
  $visible: boolean;
  $interactive: boolean;
}>`
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  pointer-events: ${({ $interactive }) => ($interactive ? 'auto' : 'none')};
  width: 100%;
  height: auto;
`;

export const _CenterToTopEntranceOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  pointer-events: auto;
`;
