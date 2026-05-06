import { createContext, useContext } from 'react';

export type CenterToTopPhase = 'center' | 'shifting' | 'done';

export const CenterToTopEntrancePhaseContext =
  createContext<CenterToTopPhase>('done');

export const useCenterToTopEntrancePhase = () =>
  useContext(CenterToTopEntrancePhaseContext);
