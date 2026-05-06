import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useNavigation } from 'globals/context/NavigationContext';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';

import { Direction } from './types';

/**
 * Determine and LATCH the center transition direction for the current location.key.
 * Order:
 *  1) Explicit one-shot intent (ltr/rtl) wins
 *  2) Fallback to history idx diff (decrease => back/rtl, increase => forward/ltr)
 * The result is latched per key to avoid mid-flight flips when intent is cleared.
 */
export const useFlowCenterDirection = (): Direction => {
  const { nextTransitionRef } = useNavigation();
  const location = useLocation();

  // Track the last known browser history index to infer the direction when needed
  const lastIdxRef = useRef<number | null>(null);

  // Latch the computed direction for the current key
  const latchedRef = useRef<{ key: string | null; dir: Direction | null }>({
    key: null,
    dir: null,
  });

  // Helper to read the current history index safely
  const getIdx = (): number | null => {
    try {
      const s = window.history.state as { idx?: unknown } | null;
      return s && typeof s.idx === 'number' ? s.idx : null;
    } catch {
      return null;
    }
  };

  if (latchedRef.current.key !== location.key) {
    // Compute a fresh direction for this new key
    const intent = nextTransitionRef.current;
    let dir: Direction | null = null;

    if (intent === TransitionType.ltr) dir = 1;
    else if (intent === TransitionType.rtl) dir = -1;

    if (dir === null) {
      const idx = getIdx();
      const lastIdx = lastIdxRef.current;

      if (idx !== null && lastIdx !== null) {
        dir = idx < lastIdx ? -1 : idx > lastIdx ? 1 : 1; // default forward on tie
      } else {
        dir = 1;
      }
    }

    latchedRef.current = { key: location.key, dir };
  }

  // After the key has changed, record the latest index for the next comparison
  useEffect(() => {
    const idx = getIdx();
    if (idx !== null) lastIdxRef.current = idx;
  }, [location.key]);

  // Always return the direction latched for this key
  return latchedRef.current.dir ?? 1;
};
