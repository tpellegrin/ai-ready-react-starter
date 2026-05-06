export type Props = {
  percentage: number; // 0–100
  index: number; // zero-based
  position: number; // one-based
  total: number;
  flowId?: string;
  step?: string;
};
