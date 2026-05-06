import { useMediaQuery as useDefaultMediaQuery } from 'hooks/useMediaQuery';
import { keysOf } from 'utils/objects';

export const sizes = {
  mobile: 320,
  tabletPortrait: 650,
  tablet: 767,
  tabletLandscape: 960,
  laptop: 1200,
  desktop: 1800,
} as const;
export type BreakpointKey = keyof typeof sizes;

export const minWidthQuery = (width: number) =>
  `@media (min-width: ${width}px)`;
export const maxWidthQuery = (width: number) =>
  `@media (max-width: ${width}px)`;

export const from: Record<BreakpointKey, string> = Object.fromEntries(
  keysOf(sizes).map((k) => [k, minWidthQuery(sizes[k])]),
) as Record<BreakpointKey, string>;

export const up = (bp: BreakpointKey) => minWidthQuery(sizes[bp]);
export const down = (bp: BreakpointKey) => maxWidthQuery(sizes[bp] - 0.02);
export const between = (min: BreakpointKey, max: BreakpointKey) =>
  `@media (min-width: ${sizes[min]}px) and (max-width: ${sizes[max] - 0.02}px)`;

// Devices that actually have hover and a fine pointer (e.g., mouse)
export const onlyHoverDevice = '@media (hover: hover) and (pointer: fine)';

export const useMediaQuery = useDefaultMediaQuery;
