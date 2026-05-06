import { useCallback, useState } from 'react';

export const useTransitionLock = () => {
  const [locked, setLocked] = useState(false);

  const lock = useCallback(
    (ms: number) => {
      if (locked) return false;
      setLocked(true);
      window.setTimeout(() => setLocked(false), ms);
      return true;
    },
    [locked],
  );

  return { locked, lock };
};
