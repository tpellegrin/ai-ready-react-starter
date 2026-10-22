import {
  Dialog as DialogRoot,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import {
  _DialogCloseButton,
  _DialogContent,
  _DialogFooter,
  _DialogHeader,
  _DialogOverlay,
} from './styles';
import { useReturnFocus } from './useReturnFocus';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  /** Actions, e.g. Cancel + a submit button (`form="<form id>"`). */
  footer?: ReactNode;
  /** Where focus goes on close if the opener no longer exists. */
  fallbackFocus?: (() => HTMLElement | null | undefined) | undefined;
};

/**
 * Modal dialog (Radix): focus moves inside and is trapped, Escape and the
 * close button dismiss it, and focus returns to the element that opened it
 * (useReturnFocus).
 * Controlled: the caller owns `open`.
 */
export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  fallbackFocus,
}: Props) => {
  const { t } = useI18n();
  const returnFocus = useReturnFocus(fallbackFocus);
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <_DialogOverlay />
        <_DialogContent
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
          // Without a description, opt out explicitly (avoids a Radix warning).
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <_DialogHeader>
            <DialogTitle asChild>
              <Text as="h2" variant="headingMd">
                {title}
              </Text>
            </DialogTitle>
            {description ? (
              <DialogDescription asChild>
                <Text color="secondary">{description}</Text>
              </DialogDescription>
            ) : null}
          </_DialogHeader>
          {children}
          {footer ? <_DialogFooter>{footer}</_DialogFooter> : null}
          {/* Last in DOM order so initial focus lands on the content (e.g. the
              first form field), while it still renders top-right. */}
          <_DialogCloseButton aria-label={t('common.actions.close')}>
            <span aria-hidden="true">×</span>
          </_DialogCloseButton>
        </_DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
};

/**
 * Dialog-family building blocks, public for other dialogs (ConfirmDialog):
 * focus return to the opener and the shared overlay/surface styles.
 */
export { useReturnFocus } from './useReturnFocus';
export { dialogContentStyles, dialogOverlayStyles } from './styles';
