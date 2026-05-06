export type Props = {
  /** Content that ends up at the top in normal flow */
  children: React.ReactElement;
  /** Optional alternative markup for the temporary overlay to avoid side-effect double-mounts */
  overlayContent?: React.ReactNode;
  /** Time held centered before sliding up */
  delayMs?: number;
  /** Transform transition duration (clamped by getAccessibleDuration) */
  durationMs?: number;
  /** Transform transition easing */
  easing?: string;
  /** Optional viewport element whose height should be used for the centering stage (defaults to window.innerHeight) */
  viewportEl?: HTMLElement | null;
  className?: string;
  style?: React.CSSProperties;
  /** Fired once when the entrance fully settles at the top */
  onDone?: () => void;
  /** If true, start already settled (skip the center hold/animation) */
  skipHold?: boolean;
};
