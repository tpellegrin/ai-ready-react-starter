export type ToastTone = 'success' | 'info' | 'error';

export type ToastOptions = {
  /** Short, localized message. */
  title: string;
  description?: string | undefined;
  tone?: ToastTone | undefined;
};

export type ToastContextValue = {
  showToast: (toast: ToastOptions) => void;
};
