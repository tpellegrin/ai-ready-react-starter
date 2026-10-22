import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * End-to-end tests (`pnpm test:e2e`). Servers build and serve the app;
 * projects run spec folders against a server in a browser.
 *
 * - production: a real build (session auth, no mocks); specs fake the API
 *   with page.route. Runs in desktop Chromium and, because the custom
 *   scrolling, transitions, focus handling and native inputs are riskiest
 *   there, in mobile WebKit (iPhone viewport).
 * - dev: the Vite dev server, i.e. React's development build with Strict
 *   Mode's effect replay (main.tsx), which built apps never exercise.
 * - demo / demo-subpath: the starter's labelled demo build (MSW in the
 *   browser), at the root and under a GitHub Pages-style sub-path.
 */
const isCI = !!process.env.CI;

type Server = {
  port: number;
  base: string;
  command: string;
  env?: Record<string, string>;
};

const build = (name: string, mode: string, port: number) =>
  [
    `vite build --mode ${mode} --outDir dist-e2e/${name} --logLevel warn`,
    `vite preview --outDir dist-e2e/${name} --port ${port} --strictPort`,
  ].join(' && ');

const servers = {
  production: {
    port: 4175,
    base: '/',
    command: build('production', 'production', 4175),
    env: { VITE_API_BASE_URL: '/api' },
  },
  dev: {
    port: 4176,
    base: '/',
    command: 'vite --mode development --port 4176 --strictPort',
  },
  // starter:demo-start
  demo: { port: 4173, base: '/', command: build('demo', 'demo', 4173) },
  demoSubpath: {
    port: 4174,
    base: '/starter/',
    command: build('demo-subpath', 'demo', 4174),
    env: { BASE_PATH: '/starter/' },
  },
  // starter:demo-end
} satisfies Record<string, Server>;

const url = (server: Server) => `http://localhost:${server.port}${server.base}`;

const project = (
  name: string,
  server: Server,
  testMatch: string,
  device = devices['Desktop Chrome'],
): Project => ({
  name,
  testMatch,
  use: { ...device, baseURL: url(server) },
});

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
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    project('production', servers.production, 'production/**/*.spec.ts'),
    project(
      'mobile-webkit',
      servers.production,
      'production/**/*.spec.ts',
      devices['iPhone 14'],
    ),
    project('dev', servers.dev, 'dev/**/*.spec.ts'),
    // starter:demo-start
    project('demo', servers.demo, 'demo/**/*.spec.ts'),
    project('demo-subpath', servers.demoSubpath, 'demo/smoke.spec.ts'),
    // starter:demo-end
  ],
  webServer: Object.values(servers).map((server: Server) => ({
    command: server.command,
    url: url(server),
    env: server.env ?? {},
    reuseExistingServer: !isCI,
    timeout: 120_000,
  })),
});
