import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..', '..');

await build({
  entryPoints: [resolve(__dirname, '..', 'src', 'index.ts')],
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
  external: ['@reactunity/renderer'],
  jsx: 'automatic',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
});
