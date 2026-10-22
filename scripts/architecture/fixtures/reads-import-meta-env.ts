// @fixture-path src/features/arch-fixture-feature/__arch__/env.ts
// @expect no-restricted-syntax: Read configuration through `config`
// Configuration is validated in one place (src/config).
export const apiUrl = import.meta.env.VITE_API_BASE_URL;
