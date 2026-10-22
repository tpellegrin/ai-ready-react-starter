/**
 * State, derived values and handlers of __Name__ (index.tsx renders).
 * Derive during render; do not mirror props into state.
 */
export const use__Name__ = (label: string) => ({
  title: label.trim(),
});
