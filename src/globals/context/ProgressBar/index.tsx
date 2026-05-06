import React, { createContext, useCallback, useMemo, useState } from 'react';

export type ProgressBarContextValue = {
  currentProgress: number;
  updateCurrentProgress: (value: number) => void;
};

export const GlobalProgressBarContext = createContext<ProgressBarContextValue>({
  currentProgress: 0,
  updateCurrentProgress: () => undefined,
});

export const ProgressBarProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [currentProgress, setCurrentProgress] = useState<number>(0);

  const updateCurrentProgress = useCallback((value: number) => {
    setCurrentProgress((prev) => {
      // Avoid unnecessary state updates
      if (prev === value) return prev;
      return value;
    });
  }, []);

  const value = useMemo(
    () => ({ currentProgress, updateCurrentProgress }),
    [currentProgress, updateCurrentProgress],
  );

  return (
    <GlobalProgressBarContext.Provider value={value}>
      {children}
    </GlobalProgressBarContext.Provider>
  );
};

export const getProgress = ({
  screens,
  position,
}: {
  screens: number;
  position: number;
}) => {
  const progress = (position / screens) * 100;
  return Number(progress.toFixed(2));
};
