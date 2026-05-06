export type Props = {
  /**
   * Progress value (0-100). If 'auto' or undefined, it will be inferred from paths.ts
   * based on the current flow step.
   */
  progress?: number | 'auto';
};
