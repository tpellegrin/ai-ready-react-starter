// @fixture-path src/features/arch-fixture-feature/__arch__/api.ts
// @expect no-restricted-globals: Requests go through apiClient
// @expect no-restricted-globals: Requests go through apiClient
export const open = () => [new XMLHttpRequest(), new WebSocket('wss://x')];
