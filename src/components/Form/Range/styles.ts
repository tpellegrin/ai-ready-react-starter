import { styled, css } from 'styled-components';

import { onlyHoverDevice } from 'styles/media';
import type { RangeVariant } from './types';

export const _RangeRoot = styled.div<{ $variant: RangeVariant }>`
  --track-h: ${({ theme }) => theme.spacers.xs};
  --thumb: ${({ theme }) => theme.spacers.xl};
  --thumb-border: ${({ theme }) => theme.colors.border.default};
  --thumb-shadow: ${({ theme }) => theme.shadows.elevation.lg};
  --track-bg: ${({ theme }) => theme.colors.accent.primary};
  --thumb-bg: ${({ theme }) => theme.colors.surface.raised};
  --thumb-content-bg: ${({ theme }) => theme.colors.surface.onDark};

  width: 100%;

  &[data-size='small'] {
    --track-h: ${({ theme }) => theme.spacers.xs};
    --thumb: ${({ theme }) => theme.spacers.xl};
  }

  &[data-size='medium'] {
    --track-h: ${({ theme }) => theme.spacers.sm};
    --thumb: ${({ theme }) => theme.spacers.xxl};
  }

  ${({ $variant, theme }) =>
    $variant === 'flat'
      ? css`
          --track-bg: ${theme.colors.accent.primary};
        `
      : css`
          --track-bg: ${theme.gradients.lowToHigh};
        `}

  &[data-disabled='true'] {
    opacity: 0.6;
    pointer-events: none;
  }
`;

export const _RangeTrack = styled.div`
  position: relative;
  width: 100%;
  height: var(--track-h);
  border-radius: ${({ theme }) => theme.borderRadii.full};
  cursor: pointer;
  background: var(--track-bg);
  touch-action: none; /* prevent scroll while dragging */
`;

export const _RangeThumb = styled.div`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: var(--thumb);
  height: var(--thumb);
  padding: calc(${({ theme }) => theme.spacers.xxs} - 0.0625rem);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.0625rem solid var(--thumb-border);
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: var(--thumb-bg);
  cursor: pointer;

  ${onlyHoverDevice} {
    &:hover {
      box-shadow: var(--thumb-shadow);
    }
  }

  [data-dragging='true'] & {
    border-color: ${({ theme }) => theme.colors.border.focus};
    box-shadow: var(--thumb-shadow);
  }
`;

export const _RangeThumbContent = styled.div`
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: var(--thumb-content-bg);
`;

export const _RangeMinMaxFootnote = styled.div`
  display: flex;
  width: 100%;
  margin-top: ${({ theme }) => theme.spacers.xs};
  gap: ${({ theme }) => theme.spacers.xs};
  justify-content: space-between;
`;
