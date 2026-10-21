import { loadAppConfig, type AppConfig } from './schema';

export type { AppConfig, AuthProviderName } from './schema';
export { ConfigError } from './schema';
export { DEMO_MODE, IS_DEV, MOCKS_ENABLED } from './buildFlags';

/**
 * The application's configuration, parsed and validated once at startup.
 * Read configuration only through this module; never read import.meta.env
 * elsewhere in src/ (enforced by lint).
 */
export const appConfig: AppConfig = loadAppConfig(import.meta.env, {
  isProductionBuild: import.meta.env.PROD,
});

/** Public base path of the deployed app (e.g. "/" or "/my-repo/"). */
export const basePath: string = import.meta.env.BASE_URL;
