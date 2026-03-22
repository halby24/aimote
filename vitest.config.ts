import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: [
            'packages/shared-types/src/**/*.test.ts',
            'packages/transport/src/**/*.test.ts',
            'packages/transport-acp-stdio/src/**/*.test.ts',
            'packages/transport-relay/src/**/*.test.ts',
            'packages/host-api/src/**/*.test.ts',
            'packages/app-core/src/**/*.test.ts',
            'packages/ui-common/src/**/*.test.ts',
          ],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'jsdom',
          include: [
            'packages/ui-react-web/src/**/*.test.tsx',
            'packages/ui-react-web/src/**/*.test.ts',
          ],
          environment: 'jsdom',
          setupFiles: ['packages/ui-react-web/src/test-setup.ts'],
        },
      },
    ],
  },
});
