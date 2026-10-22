// @fixture-path src/components/__arch__/RawFetch.tsx
// @expect no-restricted-globals: Requests go through apiClient
// @expect no-restricted-properties: Requests go through apiClient
// Shared UI (or any production code) must not bypass the API boundary.
export const load = () =>
  Promise.all([fetch('/api/items'), window.fetch('/api/other')]);
