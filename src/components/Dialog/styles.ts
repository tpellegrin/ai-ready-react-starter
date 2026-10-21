import {
  DialogClose,
  DialogContent,
  DialogOverlay,
} from '@radix-ui/react-dialog';
import { css, styled } from 'styled-components';

import { focusRing } from 'styles/mixins';

/** Shared by Dialog and ConfirmDialog (both render in a portal on body). */
export const dialogOverlayStyles = css`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndexes.modal};
  background: ${({ theme }) => theme.colors.transparent.overlay};
`;

export const dialogContentStyles = css`
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: ${({ theme }) => theme.zIndexes.modal};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: min(32rem, calc(100vw - 2 * ${({ theme }) => theme.spacers.md}));
  max-height: calc(100dvh - 2 * ${({ theme }) => theme.spacers.md});
  padding: ${({ theme }) => theme.spacers.lg};
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.borderRadii.md};
  background: ${({ theme }) => theme.colors.surface.raised};
  color: ${({ theme }) => theme.colors.text.primary};
  box-shadow: ${({ theme }) => theme.shadows.elevation.lg};
  transform: translate(-50%, -50%);

  &:focus-visible {
    ${focusRing};
  }
`;

export const _DialogOverlay = styled(DialogOverlay)`
  ${dialogOverlayStyles}
`;

export const _DialogContent = styled(DialogContent)`
  ${dialogContentStyles}
`;

export const _DialogHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxs};
  padding-inline-end: ${({ theme }) => theme.spacers.xl};
`;

export const _DialogFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacers.xs};
`;

export const _DialogCloseButton = styled(DialogClose)`
  position: absolute;
  top: ${({ theme }) => theme.spacers.md};
  right: ${({ theme }) => theme.spacers.md};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ theme }) => theme.spacers.xl};
  height: ${({ theme }) => theme.spacers.xl};
  padding: 0;
  border: 0;
  border-radius: ${({ theme }) => theme.borderRadii.full};
  background: transparent;
  color: inherit;
  font-size: ${({ theme }) => theme.fontSizes.headingSmall};
  line-height: 1;
  cursor: pointer;

  &:focus-visible {
    ${focusRing};
  }
`;
