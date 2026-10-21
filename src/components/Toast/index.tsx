import {
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
} from '@radix-ui/react-toast';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { _ToastClose, _ToastRoot, _ToastText, _ToastViewport } from './styles';
import type { ToastContextValue, ToastOptions, ToastTone } from './types';

const ToastContext = createContext<ToastContextValue | null>(null);

type ActiveToast = {
  id: number;
  title: string;
  description: string | undefined;
  tone: ToastTone;
};

/**
 * Transient confirmations (e.g. "Saved"). Announced politely (errors
 * assertively) through the Radix live region; F8 focuses the region. Keep
 * important errors inline too: toasts disappear.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(
    ({ title, description, tone = 'success' }: ToastOptions) => {
      nextId.current += 1;
      const toast = { id: nextId.current, title, description, tone };
      setToasts((current) => [...current, toast]);
    },
    [],
  );

  const dismiss = (id: number) =>
    setToasts((current) => current.filter((toast) => toast.id !== id));

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToastProvider
        duration={5000}
        label={t('common.notifications.item')}
      >
        {children}
        {toasts.map((toast) => (
          <_ToastRoot
            key={toast.id}
            $tone={toast.tone}
            type={toast.tone === 'error' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) dismiss(toast.id);
            }}
          >
            <_ToastText>
              <ToastTitle asChild>
                <Text variant="bodyMdBold">{toast.title}</Text>
              </ToastTitle>
              {toast.description ? (
                <ToastDescription asChild>
                  <Text>{toast.description}</Text>
                </ToastDescription>
              ) : null}
            </_ToastText>
            <_ToastClose aria-label={t('common.actions.dismiss')}>
              <span aria-hidden="true">×</span>
            </_ToastClose>
          </_ToastRoot>
        ))}
        <_ToastViewport label={t('common.notifications.region')} />
      </RadixToastProvider>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export type { ToastOptions, ToastTone } from './types';
