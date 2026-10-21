import { z } from 'zod';

/**
 * Application configuration contract.
 *
 * Pure module: no `import.meta.env`, no DOM. It is imported by the browser
 * runtime (src/config/index.ts) and by vite.config.ts, so the same rules
 * validate at build/dev-server start and at runtime.
 *
 * All values come from VITE_* variables, which Vite inlines into the public
 * bundle at build time. They are not secrets and not runtime-configurable:
 * changing them requires a rebuild. See docs/configuration.md.
 */

// starter:demo-start
export const AUTH_PROVIDERS = ['session', 'demo'] as const;
// starter:demo-else
// export const AUTH_PROVIDERS = ['session'] as const;
// starter:demo-end
export type AuthProviderName = (typeof AUTH_PROVIDERS)[number];

export type AppConfig = {
  /** Display name (document title, header). */
  appName: string;
  /** API origin or root-relative path, without a trailing slash. */
  apiBaseUrl: string;
  /** Which AuthAdapter the composition root wires. */
  authProvider: AuthProviderName;
  /** Demo/reference mode: demo auth, DemoHub, public onboarding preview. */
  demoMode: boolean;
  /** Start the MSW browser worker (reference API) before rendering. */
  mocksEnabled: boolean;
};

export type ConfigContext = {
  /**
   * True for `vite build` output (import.meta.env.PROD at runtime). Real
   * deployments get the strictest rules; the demo mode is an explicit opt-out.
   */
  isProductionBuild: boolean;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const flag = (name: string) =>
  z
    .enum(['true', 'false'], {
      error: () => `${name} must be "true" or "false"`,
    })
    .default('false')
    .transform((value) => value === 'true');

const parseAbsoluteUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const apiBaseUrl = z
  .string({ error: 'VITE_API_BASE_URL is required' })
  .trim()
  .refine(
    (value) => {
      if (value.startsWith('/')) return !value.startsWith('//');
      const url = parseAbsoluteUrl(value);
      return url?.protocol === 'http:' || url?.protocol === 'https:';
    },
    {
      error:
        'VITE_API_BASE_URL must be an absolute http(s) URL or a root-relative path such as "/api"',
    },
  )
  .transform((value) => value.replace(/\/+$/, ''));

const envSchema = z.object({
  VITE_APP_NAME: z
    .string()
    .trim()
    .min(1, 'VITE_APP_NAME must not be empty')
    .default('React Starter'),
  VITE_API_BASE_URL: apiBaseUrl,
  VITE_AUTH_PROVIDER: z.enum(AUTH_PROVIDERS, {
    error: () =>
      `VITE_AUTH_PROVIDER must be one of: ${AUTH_PROVIDERS.join(', ')}`,
  }),
  VITE_DEMO_MODE: flag('VITE_DEMO_MODE'),
  VITE_ENABLE_MOCKS: flag('VITE_ENABLE_MOCKS'),
});

/** Treat empty strings (e.g. `VITE_API_BASE_URL=`) as "not set". */
const withoutEmptyValues = (env: unknown): Record<string, unknown> => {
  if (!env || typeof env !== 'object') return {};
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== ''),
  );
};

export type ConfigResult =
  | { ok: true; config: AppConfig }
  | { ok: false; issues: string[] };

export const parseAppConfig = (
  env: unknown,
  context: ConfigContext,
): ConfigResult => {
  const parsed = envSchema.safeParse(withoutEmptyValues(env));
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  const raw = parsed.data;
  const config: AppConfig = {
    appName: raw.VITE_APP_NAME,
    apiBaseUrl: raw.VITE_API_BASE_URL,
    authProvider: raw.VITE_AUTH_PROVIDER,
    demoMode: raw.VITE_DEMO_MODE,
    mocksEnabled: raw.VITE_ENABLE_MOCKS,
  };

  const issues: string[] = [];
  // starter:demo-start
  if (config.authProvider === 'demo' && !config.demoMode) {
    issues.push(
      'VITE_AUTH_PROVIDER=demo requires VITE_DEMO_MODE=true (the demo adapter signs in anyone).',
    );
  }
  // starter:demo-end
  if (context.isProductionBuild && !config.demoMode) {
    if (config.mocksEnabled) {
      issues.push(
        'VITE_ENABLE_MOCKS=true is not allowed in a production build unless VITE_DEMO_MODE=true.',
      );
    }
    const url = parseAbsoluteUrl(config.apiBaseUrl);
    if (url?.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) {
      issues.push(
        'VITE_API_BASE_URL must use https:// in a production build (http is allowed only for localhost).',
      );
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, config };
};

export const formatConfigIssues = (issues: readonly string[]): string =>
  [
    'Invalid application configuration:',
    ...issues.map((issue) => `  - ${issue}`),
    'See .env.example and docs/configuration.md.',
  ].join('\n');

export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(formatConfigIssues(issues));
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/** Parse or throw a ConfigError with a readable, multi-line message. */
export const loadAppConfig = (
  env: unknown,
  context: ConfigContext,
): AppConfig => {
  const result = parseAppConfig(env, context);
  if (!result.ok) throw new ConfigError(result.issues);
  return result.config;
};
