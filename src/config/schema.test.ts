import { ConfigError, loadAppConfig, parseAppConfig } from './schema';

const PROD = { isProductionBuild: true };
const DEV = { isProductionBuild: false };

const productionEnv = {
  VITE_APP_NAME: 'Product',
  VITE_API_BASE_URL: 'https://api.example.com/v1/',
  VITE_AUTH_PROVIDER: 'session',
  VITE_DEMO_MODE: 'false',
  VITE_ENABLE_MOCKS: 'false',
};

const issuesOf = (env: Record<string, string>, context = PROD) => {
  const result = parseAppConfig(env, context);
  return result.ok ? [] : result.issues;
};

describe('parseAppConfig', () => {
  it('parses a valid production configuration', () => {
    expect(parseAppConfig(productionEnv, PROD)).toEqual({
      ok: true,
      config: {
        appName: 'Product',
        apiBaseUrl: 'https://api.example.com/v1',
        authProvider: 'session',
        demoMode: false,
        mocksEnabled: false,
      },
    });
  });

  it('allows mocks in a production build only in demo mode (preview deployments)', () => {
    const result = parseAppConfig(
      {
        VITE_API_BASE_URL: '/api',
        VITE_AUTH_PROVIDER: 'session',
        VITE_DEMO_MODE: 'true',
        VITE_ENABLE_MOCKS: 'true',
      },
      PROD,
    );
    expect(result).toMatchObject({
      ok: true,
      config: { apiBaseUrl: '/api', demoMode: true, mocksEnabled: true },
    });
  });

  it.each(['yes', 'TRUE', '1', 'on', ' true'])(
    'rejects ambiguous boolean %j instead of guessing',
    (value) => {
      expect(issuesOf({ ...productionEnv, VITE_DEMO_MODE: value })).toEqual([
        'VITE_DEMO_MODE must be "true" or "false"',
      ]);
    },
  );

  it('defaults absent flags to false and the app name to a neutral value', () => {
    const result = parseAppConfig(
      { VITE_API_BASE_URL: '/api', VITE_AUTH_PROVIDER: 'session' },
      PROD,
    );
    expect(result).toMatchObject({
      ok: true,
      config: {
        appName: 'React Starter',
        demoMode: false,
        mocksEnabled: false,
      },
    });
  });

  it('treats an empty value as missing', () => {
    expect(issuesOf({ ...productionEnv, VITE_API_BASE_URL: '' })).toEqual([
      'VITE_API_BASE_URL is required',
    ]);
  });

  it.each([
    'api.example.com',
    'ftp://files.example.com',
    '//cdn.example.com/api',
    'not a url',
  ])('rejects API base URL %j', (value) => {
    expect(issuesOf({ ...productionEnv, VITE_API_BASE_URL: value })).toEqual([
      'VITE_API_BASE_URL must be an absolute http(s) URL or a root-relative path such as "/api"',
    ]);
  });

  it('requires https for absolute API URLs in production builds, except localhost', () => {
    const insecure = {
      ...productionEnv,
      VITE_API_BASE_URL: 'http://api.example.com',
    };
    expect(issuesOf(insecure)).toEqual([
      'VITE_API_BASE_URL must use https:// in a production build (http is allowed only for localhost).',
    ]);
    expect(issuesOf(insecure, DEV)).toEqual([]);
    expect(
      issuesOf({
        ...productionEnv,
        VITE_API_BASE_URL: 'http://localhost:8080',
      }),
    ).toEqual([]);
  });

  // starter:demo-start
  it('rejects the demo auth adapter outside demo mode, in every mode', () => {
    const env = { ...productionEnv, VITE_AUTH_PROVIDER: 'demo' };
    const expected = [
      'VITE_AUTH_PROVIDER=demo requires VITE_DEMO_MODE=true (the demo adapter signs in anyone).',
    ];
    expect(issuesOf(env, PROD)).toEqual(expected);
    expect(issuesOf(env, DEV)).toEqual(expected);
  });
  // starter:demo-end

  it('rejects mocks in a non-demo production build but allows them in development', () => {
    const env = { ...productionEnv, VITE_ENABLE_MOCKS: 'true' };
    expect(issuesOf(env, PROD)).toEqual([
      'VITE_ENABLE_MOCKS=true is not allowed in a production build unless VITE_DEMO_MODE=true.',
    ]);
    expect(issuesOf(env, DEV)).toEqual([]);
  });

  it('rejects unknown auth providers', () => {
    expect(issuesOf({ ...productionEnv, VITE_AUTH_PROVIDER: 'oidc' })).toEqual([
      // starter:demo-start
      'VITE_AUTH_PROVIDER must be one of: session, demo',
      // starter:demo-else
      // 'VITE_AUTH_PROVIDER must be one of: session',
      // starter:demo-end
    ]);
  });

  it('reports every problem at once', () => {
    expect(
      issuesOf({ VITE_DEMO_MODE: 'maybe', VITE_AUTH_PROVIDER: 'x' }),
    ).toHaveLength(3);
  });
});

describe('loadAppConfig', () => {
  it('throws a ConfigError with a readable diagnostic', () => {
    let caught: unknown;
    try {
      loadAppConfig({ VITE_AUTH_PROVIDER: 'session' }, PROD);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as ConfigError).message).toBe(
      [
        'Invalid application configuration:',
        '  - VITE_API_BASE_URL is required',
        'See .env.example and docs/configuration.md.',
      ].join('\n'),
    );
  });
});
