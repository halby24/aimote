import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isE2E = !!process.env['VITE_E2E'];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: isE2E
    ? {
        alias: {
          '@tauri-apps/api/core': path.resolve(__dirname, 'e2e/mocks/tauri-api-mock.ts'),
          '@tauri-apps/api/event': path.resolve(__dirname, 'e2e/mocks/tauri-api-mock.ts'),
        },
      }
    : undefined,
  build: {
    target: 'es2022',
    minify: !process.env['TAURI_DEBUG'] ? 'esbuild' : false,
    sourcemap: !!process.env['TAURI_DEBUG'],
  },
});
