import { styled, css } from 'styled-components';

import { from } from 'styles/media';
import { hideScrollbar } from 'styles/mixins';
import { getSpaceColor, SpaceColorKeys } from 'utils/colors';

const setBackground = ($backgroundColor?: SpaceColorKeys<'surface'>) => {
  return (
    $backgroundColor &&
    css`
      background-color: ${({ theme }) =>
        getSpaceColor(theme, $backgroundColor, 'surface')};
    `
  );
};

const applyLeftAdjustment = ($adjustLeft?: boolean) => {
  return (
    $adjustLeft &&
    css`
      left: calc(-50vw + 50%);
    `
  );
};

export const _CarouselRoot = styled.div<{
  $adjustLeft?: boolean;
  $backgroundColor?: SpaceColorKeys<'surface'>;
}>`
  display: flex;
  flex-direction: column;
  width: 100vw;
  position: relative;
  gap: 1rem;
  padding: 1.5rem 1rem;
  ${({ $adjustLeft }) => applyLeftAdjustment($adjustLeft)}
  ${({ $backgroundColor }) => setBackground($backgroundColor)}
`;

export const _CarouselViewport = styled.div<{
  $adjustLeft?: boolean;
  $backgroundColor?: SpaceColorKeys<'surface'>;
}>`
  width: 100vw;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  ${({ $adjustLeft }) => applyLeftAdjustment($adjustLeft)}
  ${({ $backgroundColor }) => setBackground($backgroundColor)}
`;

_CarouselViewport.defaultProps = {
  $adjustLeft: true,
};

export const _CarouselTrack = styled.div`
  display: flex;
  position: relative;
  overflow: scroll hidden;
  gap: 1rem !important;
  height: fit-content;
  padding-inline: 1rem;
  ${hideScrollbar()}
  padding-bottom: 1rem;
  margin-bottom: -1rem;
  align-items: stretch;
  scroll-snap-type: x mandatory;
`;

export const _CarouselSlide = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 90%;
  scroll-snap-align: center;

  ${from.tabletPortrait} {
    inline-size: 21.25rem;
    min-width: 20rem;
  }
`;
