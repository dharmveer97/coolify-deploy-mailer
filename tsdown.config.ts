import { defineConfig } from 'tsdown';

/** Bundles src/ into dist/index.js for production. `@/…` aliases are resolved from tsconfig.json. */
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: false,
});
