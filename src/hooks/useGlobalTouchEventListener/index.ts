import { useEffect } from 'react';

export function useGlobalTouchEventListener(
  eventName: 'touchmove' | 'touchend',
  handler: (event: TouchEvent) => void,
  options?: boolean | AddEventListenerOptions,
) {
  useEffect(() => {
    const eventListener = (event: Event) => {
      handler(event as TouchEvent);
    };

    document.addEventListener(eventName, eventListener, options);

    return () => {
      document.removeEventListener(eventName, eventListener);
    };
  }, [eventName, handler, options]);
}
