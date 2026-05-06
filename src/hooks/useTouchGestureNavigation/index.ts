import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_DISTANCE_FROM_EDGE = 16;
const MIN_DISTANCE_TRAVELED = Math.min(
  Math.max(document.body.clientWidth * 0.1, 48),
  96,
);

const DATA_PROPS_NAME = 'no-touch-gesture-navigation';
const DATA_PROP = `data-${DATA_PROPS_NAME}`;

// Pass this as {...DO_NOT_TRIGGER_GESTURE_NAVIGATION_PROPS}
// to containers of horizontally scrollable content, i.e., sliders,
// to make sure touch navigation isn't triggered when scrolling that content.
export const DO_NOT_TRIGGER_GESTURE_NAVIGATION_PROPS = { [DATA_PROP]: true };

export const useTouchGestureNavigation = (isEnabled = true) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEnabled) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleSwipe = () => {
      const distance = touchEndX - touchStartX;

      if (Math.abs(distance) < MIN_DISTANCE_TRAVELED) return;

      // left-to-right: go back
      if (distance > 0) {
        if (touchStartX > MAX_DISTANCE_FROM_EDGE) return;

        return navigate(-1);
      }

      // right-to-left: go forwads
      if (distance < 0) {
        if (touchStartX < document.body.clientWidth - MAX_DISTANCE_FROM_EDGE)
          return;

        return navigate(1);
      }
    };

    const isElementOrParentScrollable = (el: HTMLElement | null) => {
      if (!el) return false;

      if (el.dataset[DATA_PROP]) return true;

      return !!el.closest(`[${DATA_PROP}]`);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isElementOrParentScrollable(e.target as HTMLElement | null)) return;

      touchStartX = e.changedTouches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (isElementOrParentScrollable(e.target as HTMLElement | null)) return;

      touchEndX = e.changedTouches[0].clientX;
      void handleSwipe();
    };

    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isEnabled, navigate]);
};
