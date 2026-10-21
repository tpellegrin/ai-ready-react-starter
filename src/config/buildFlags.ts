/**
 * Build-time feature gates.
 *
 * Vite replaces `import.meta.env.VITE_*` with string literals at build time,
 * so these compare two literals and the bundler removes `if (DEMO_MODE)`
 * branches — including their dynamic imports — from builds where the flag is
 * "false". Use these (not `appConfig`) to gate code that must be physically
 * absent from production bundles: demo auth, demo routes, MSW.
 *
 * appConfig validates the same variables, so an invalid value never builds.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS === 'true';

/** Development server / non-production build: enables dev-only diagnostics. */
export const IS_DEV = import.meta.env.DEV;
