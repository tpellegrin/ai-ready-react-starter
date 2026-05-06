import { useEffect } from 'react';

export function useGlobalMouseEventListener(
  eventName: 'mousemove' | 'mouseup',
  handler: (event: MouseEvent) => void,
  options?: boolean | AddEventListenerOptions,
) {
  useEffect(() => {
    const eventListener = (event: Event) => {
      handler(event as MouseEvent);
    };

    document.addEventListener(eventName, eventListener, options);

    return () => {
      document.removeEventListener(eventName, eventListener);
    };
  }, [eventName, handler, options]);
}
