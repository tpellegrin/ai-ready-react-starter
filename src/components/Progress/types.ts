export type Props = {
  /** Accessible name, e.g. "Progress" (a progressbar must be labelled). */
  label: string;
  percentage: number;
  variant?: 'rounded' | 'rectangular';
};
