// @fixture-path src/api/http/__arch__/transport.ts
// @expect none
// The HTTP client is the one place that calls fetch.
export const send = (url: string) => fetch(url);
