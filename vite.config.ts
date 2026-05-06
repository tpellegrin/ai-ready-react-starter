import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tsconfigPaths(), svgr()],
  base: '/',
  build: {
    outDir: './build',
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
