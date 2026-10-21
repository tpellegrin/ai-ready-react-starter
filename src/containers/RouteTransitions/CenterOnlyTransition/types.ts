export type Direction = 1 | -1;
export type CenterPhase = 'idle' | 'overlay' | 'settled';

export type Props = {
  children: React.ReactNode;
  routeKey: string;
  direction: Direction;
  duration?: number;
  easing?: string;
  className?: string;
};

export interface HookConfig {
  transitionEpoch: number;
  activeOverlay: boolean;
  exitOverlay: React.ReactNode | null;
  setActiveOverlay: (value: boolean) => void;
  setExitOverlay: (value: React.ReactNode | null) => void;
  setPhase: (phase: CenterPhase) => void;
  duration: number;
  easing: string;
  direction: Direction;
  reduceMotion: boolean;
  stageRef: React.RefObject<HTMLDivElement | null>;
  activeRef: React.RefObject<HTMLDivElement | null>;
  exitRef: React.RefObject<HTMLDivElement | null>;
}
