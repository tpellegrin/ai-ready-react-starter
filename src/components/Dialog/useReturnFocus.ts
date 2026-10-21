import { useRef } from 'react';

/**
 * Focus return for controlled Radix dialogs. Radix restores focus only to a
 * `Dialog.Trigger`; dialogs opened from app state (e.g. a list row's "Edit"
 * button) need this. On close, focus goes back to the element that had it
 * when the dialog opened, or to `fallback` when that element is gone (e.g.
 * the row was deleted).
 */
export const useReturnFocus = (
  fallback?: () => HTMLElement | null | undefined,
) => {
  const openerRef = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      const active = document.activeElement;
      openerRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      const opener = openerRef.current;
      openerRef.current = null;
      (opener?.isConnected ? opener : fallback?.())?.focus();
    },
  };
};
