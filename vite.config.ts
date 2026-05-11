import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName =
  process.env.GITHUB_PAGES_REPO ||
  process.env.GITHUB_REPOSITORY?.split('/')[1] ||
  '';
const base = isGitHubPages && repoName ? `/${repoName}/` : '/';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tsconfigPaths(), svgr()],
  base,
  build: {
    outDir: './dist',
    sourcemap: false,
    rollupOptions: {
      external: /\/mocks\/.*/,
      cache: false,
    },
  },
  optimizeDeps: {
    exclude: ['js-big-decimal'],
    // exclude: ['@matrix-org/olm'],
  },
  define: {
    'process.env': {},
  },
  server: {
    hmr: {
      protocol: 'ws',
      // Add you ip here for live-reload
      // host: '192.168.1.20',
    },
  },
});
