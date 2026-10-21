import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogPortal,
  AlertDialogTitle,
} from '@radix-ui/react-alert-dialog';

import { Button } from 'components/Button';
import { useReturnFocus } from 'components/Dialog/useReturnFocus';
import { InlineAlert } from 'components/InlineAlert';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import {
  _ConfirmDialogContent,
  _ConfirmDialogFooter,
  _ConfirmDialogOverlay,
} from './styles';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** While the action runs: confirm shows progress and dismissal is blocked. */
  isPending?: boolean | undefined;
  /** Localized error from a failed attempt; the dialog stays open to retry. */
  error?: string | undefined;
  onConfirm: () => void;
  /** Where focus goes on close if the opener is gone (e.g. a deleted row). */
  fallbackFocus?: (() => HTMLElement | null | undefined) | undefined;
};

/**
 * Confirmation for destructive or irreversible actions (Radix AlertDialog).
 * Initial focus is on Cancel; the dialog closes only when the caller sets
 * `open` to false (e.g. after the action succeeds).
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending = false,
  error,
  onConfirm,
  fallbackFocus,
}: Props) => {
  const { t } = useI18n();
  const returnFocus = useReturnFocus(fallbackFocus);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <AlertDialogPortal>
        <_ConfirmDialogOverlay />
        <_ConfirmDialogContent
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        >
          <AlertDialogTitle asChild>
            <Text as="h2" variant="headingMd">
              {title}
            </Text>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <Text>{description}</Text>
          </AlertDialogDescription>
          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          <_ConfirmDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                isCompact
                variant="secondary"
                label={t('common.actions.cancel')}
                disabled={isPending}
              />
            </AlertDialogCancel>
            <Button
              isCompact
              variant="primary"
              label={confirmLabel}
              isPending={isPending}
              onClick={onConfirm}
            />
          </_ConfirmDialogFooter>
        </_ConfirmDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  );
};
