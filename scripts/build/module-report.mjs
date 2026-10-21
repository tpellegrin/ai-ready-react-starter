import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';

/**
 * Records which source modules ended up in which output chunk, for
 * `pnpm check:build` (budgets, code splitting, no demo/mock code in real
 * builds). Written to reports/build/<outDir>.json, outside the deployed
 * directory.
 *
 * @returns {import('vite').Plugin}
 */
export const moduleReport = () => {
  let root = process.cwd();
  let outDir = 'dist';
  let base = '/';
  let mode = 'production';

  /** @param {string} id */
  const normalize = (id) => {
    const clean = id.replace(/^\0/, '').split('?')[0] ?? id;
    return relative(root, clean).split('\\').join('/');
  };

  return {
    name: 'starter:module-report',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
      base = config.base;
      mode = config.mode;
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((output) => output.type === 'chunk')
        .map((chunk) => ({
          fileName: chunk.fileName,
          isEntry: chunk.isEntry,
          isDynamicEntry: chunk.isDynamicEntry,
          facadeModule: chunk.facadeModuleId
            ? normalize(chunk.facadeModuleId)
            : null,
          imports: chunk.imports,
          dynamicImports: chunk.dynamicImports,
          // Rendered (minified, pre-gzip) bytes per source module.
          modules: Object.fromEntries(
            Object.entries(chunk.modules)
              .map(
                ([id, info]) =>
                  /** @type {[string, number]} */ ([
                    normalize(id),
                    info.renderedLength,
                  ]),
              )
              .sort(([a], [b]) => a.localeCompare(b)),
          ),
        }));
      const assets = Object.values(bundle)
        .filter((output) => output.type === 'asset')
        .map((asset) => asset.fileName);

      const reportDir = resolve(root, 'reports/build');
      mkdirSync(reportDir, { recursive: true });
      writeFileSync(
        resolve(reportDir, `${basename(outDir)}.json`),
        `${JSON.stringify({ mode, base, outDir: normalize(resolve(root, outDir)), chunks, assets }, null, 2)}\n`,
      );
    },
  };
};
