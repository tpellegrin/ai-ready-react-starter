import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * End-to-end tests against BUILT apps served by `vite preview`
 * (`pnpm test:e2e`). Each target builds its own output under dist-e2e/.
 */
const isCI = !!process.env.CI;

type Target = {
  name: string;
  port: number;
  base: string;
  mode: string;
  env: Record<string, string>;
  testMatch: string;
};

const targets: Target[] = [
  // A real build (session auth, no mocks); each test mocks the API with
  // page.route.
  {
    name: 'production',
    port: 4175,
    base: '/',
    mode: 'production',
    env: { VITE_API_BASE_URL: '/api' },
    testMatch: 'production/**/*.spec.ts',
  },
  // starter:demo-start
  // The demo build at the domain root (MSW in the browser)...
  {
    name: 'demo',
    port: 4173,
    base: '/',
    mode: 'demo',
    env: {},
    testMatch: 'demo/**/*.spec.ts',
  },
  // ...and under a sub-path, like GitHub Pages.
  {
    name: 'demo-subpath',
    port: 4174,
    base: '/starter/',
    mode: 'demo',
    env: { BASE_PATH: '/starter/' },
    testMatch: 'demo/smoke.spec.ts',
  },
  // starter:demo-end
];

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry on CI captures a trace; a test that only passes on retry is
  // still reported as a failure.
  retries: isCI ? 1 : 0,
  failOnFlakyTests: isCI,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: targets.map(
    (target): Project => ({
      name: target.name,
      testMatch: target.testMatch,
      use: { baseURL: `http://localhost:${target.port}${target.base}` },
    }),
  ),
  webServer: targets.map((target) => ({
    command: [
      `vite build --mode ${target.mode} --outDir dist-e2e/${target.name} --logLevel warn`,
      `vite preview --outDir dist-e2e/${target.name} --port ${target.port} --strictPort`,
    ].join(' && '),
    url: `http://localhost:${target.port}${target.base}`,
    env: target.env,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  })),
});
