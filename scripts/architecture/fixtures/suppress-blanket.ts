/* eslint-disable */
// @fixture-path src/views/__arch__/blanket.ts
// @expect starter/no-protected-suppression: A blanket "eslint-disable" hides every rule
// A blanket disable cannot hide itself: arch:check re-lints with inline
// configuration off.
export const value: any = 1;
