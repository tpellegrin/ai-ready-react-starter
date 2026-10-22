import {
  AlertDialogContent,
  AlertDialogOverlay,
} from '@radix-ui/react-alert-dialog';
import { styled } from 'styled-components';

import { dialogContentStyles, dialogOverlayStyles } from 'components/Dialog';

export const _ConfirmDialogOverlay = styled(AlertDialogOverlay)`
  ${dialogOverlayStyles}
`;

export const _ConfirmDialogContent = styled(AlertDialogContent)`
  ${dialogContentStyles}

  width: min(28rem, calc(100vw - 2 * ${({ theme }) => theme.spacers.md}));
`;

export const _ConfirmDialogFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacers.xs};
`;
