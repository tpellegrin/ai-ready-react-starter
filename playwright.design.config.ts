import { defineConfig, devices } from '@playwright/test';

/**
 * Design captures and visual regression (`pnpm design capture|regress`,
 * scripts/lib/design/capture.mjs). Not part of `pnpm test:e2e`: the spec
 * runs the scenarios of a composition plan, handed over in the manifest
 * named by DESIGN_MANIFEST.
 *
 * - A fresh production build every run (never a server left over from an
 *   earlier run, which could show stale code), API under /api, answered
 *   only by each scenario's declared responses.
 * - Evidence goes to the run's own folder (DESIGN_OUTPUT_DIR), so a run never
 *   cleans another's results or the e2e test-results/.
 * - Baselines: design/<task>/baselines/<scenario>-<browser>-<platform>.png.
 *   Snapshots are never written unless the command passes
 *   --update-snapshots (`pnpm design regress --update`); a missing baseline
 *   fails.
 */
const port = 4177;
const outputDir = process.env.DESIGN_OUTPUT_DIR;
if (!outputDir || !process.env.DESIGN_MANIFEST) {
  throw new Error(
    'Run design captures through `pnpm design capture|regress` (it prepares the run folder and manifest).',
  );
}

export default defineConfig({
  testDir: 'e2e/design',
  testMatch: 'capture.spec.ts',
  outputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['json']],
  updateSnapshots: 'none',
  snapshotPathTemplate: 'design/{arg}{-projectName}{-platform}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'device',
    },
  },
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: 'off',
    screenshot: 'off',
    timezoneId: 'UTC',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: [
      'vite build --mode production --outDir dist-e2e/design --logLevel warn',
      `vite preview --outDir dist-e2e/design --port ${port} --strictPort`,
    ].join(' && '),
    url: `http://localhost:${port}/`,
    env: { VITE_API_BASE_URL: '/api' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
