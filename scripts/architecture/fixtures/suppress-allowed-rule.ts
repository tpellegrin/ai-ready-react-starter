// @fixture-path src/hooks/__arch__/useOnce.ts
// @expect none
// Ordinary rules can still be disabled with a reason.
import { useEffect } from 'react';

export const useOnce = (callback: () => void) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run on mount only
  useEffect(callback, []);
};
