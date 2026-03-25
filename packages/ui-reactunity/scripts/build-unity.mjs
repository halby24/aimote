import { build } from 'esbuild';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..', '..');

// @reactunity/renderer uses `import * as Reconciler from 'react-reconciler'`
// then calls Reconciler(hostConfig). esbuild's CJS bundle wraps namespace imports
// as non-callable objects. This plugin rewrites the import to a default import.
const fixReconcilerPlugin = {
  name: 'fix-reconciler-import',
  setup(build) {
    build.onLoad({ filter: /reconciler\.js$/ }, async (args) => {
      let contents = await readFile(args.path, 'utf8');
      if (contents.includes("import * as Reconciler from 'react-reconciler'")) {
        contents = contents.replace(
          /import \* as Reconciler from ['"]react-reconciler['"]/g,
          "import Reconciler from 'react-reconciler'",
        );
        return { contents, loader: 'js' };
      }
      return undefined; // let esbuild handle normally
    });
  },
};

await build({
  entryPoints: [resolve(__dirname, '..', 'src', 'unity-entry.tsx')],
  bundle: true,
  outfile: resolve(
    root,
    'unity-packages',
    'com.acme.aimote-ui',
    'Runtime',
    'Resources',
    'react',
    'index.js',
  ),
  format: 'cjs',
  target: 'es2020',
  jsx: 'automatic',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  plugins: [fixReconcilerPlugin],
});
