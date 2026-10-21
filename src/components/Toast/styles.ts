import {
  ToastClose,
  Toast as ToastRoot,
  ToastViewport,
} from '@radix-ui/react-toast';
import { styled } from 'styled-components';

import { focusRing } from 'styles/mixins';
import { from } from 'styles/media';

import type { ToastTone } from './types';

export const _ToastViewport = styled(ToastViewport)`
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: ${({ theme }) => theme.zIndexes.toast};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xs};
  width: 100%;
  max-width: 100vw;
  margin: 0;
  padding: ${({ theme }) => theme.spacers.md};
  list-style: none;
  outline: none;

  ${from.tabletPortrait} {
    right: 0;
    left: auto;
    width: 24rem;
  }
`;

export const _ToastRoot = styled(ToastRoot)<{ $tone: ToastTone }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacers.sm};
  padding: ${({ theme }) => theme.spacers.sm} ${({ theme }) => theme.spacers.md};
  border: 0.0625rem solid
    ${({ theme, $tone }) => theme.colors.feedback[$tone].border};
  border-left-width: 0.25rem;
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme }) => theme.colors.surface.raised};
  color: ${({ theme }) => theme.colors.text.primary};
  box-shadow: ${({ theme }) => theme.shadows.elevation.md};

  &:focus-visible {
    ${focusRing};
  }
`;

export const _ToastText = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.xxxs};
  min-width: 0;
`;

export const _ToastClose = styled(ToastClose)`
  flex: 0 0 auto;
  padding: 0 ${({ theme }) => theme.spacers.xxs};
  border: 0;
  border-radius: ${({ theme }) => theme.borderRadii.xs};
  background: transparent;
  color: inherit;
  font-size: ${({ theme }) => theme.fontSizes.headingXSmall};
  line-height: 1;
  cursor: pointer;

  &:focus-visible {
    ${focusRing};
  }
`;
