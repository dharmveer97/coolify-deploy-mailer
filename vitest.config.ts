import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      '@test/': fileURLToPath(new URL('./test/', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Startup wiring runs in a child process in test/integration/process.test.ts,
      // src/types only contains type declarations, and previews are dev-only fixtures.
      exclude: ['src/index.ts', 'src/server.ts', 'src/types/**', 'src/emails/previews/**'],
      reporter: ['text', 'html'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
