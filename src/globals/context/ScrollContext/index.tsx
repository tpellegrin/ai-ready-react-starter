import {
  createContext,
  FC,
  ReactNode,
  RefObject,
  useContext,
  useRef,
} from 'react';

const ScrollContext = createContext<RefObject<HTMLElement | null> | null>(null);

export const ScrollProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const mainRef = useRef<HTMLElement | null>(null);
  return (
    <ScrollContext.Provider value={mainRef}>{children}</ScrollContext.Provider>
  );
};

export const useScrollRef = () => {
  return useContext(ScrollContext);
};
