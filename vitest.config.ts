import { defineConfig } from 'vitest/config';

const ci = Boolean(process.env.CI);

// Tests live next to the code they cover (src/<folder>/<module>.test.ts). Each folder is its own
// Vitest project, so `vitest --project ui` runs one layer and the report is grouped by folder.
// Shared helpers are in src/testing. The browser-level checks are in e2e/ (npm run test:e2e).
const folder = (name: string, options: { environment: 'node' | 'jsdom'; setupFiles?: string[] }) => ({
  extends: true as const,
  test: { name, include: [`src/${name}/**/*.test.ts`], ...options },
});

export default defineConfig({
  // The same build-time constants the esbuild bundles get (scripts/build.mjs).
  define: { __GALLEY_DEV__: false, __GALLEY_MATCHES__: [] },
  test: {
    // Unit tests never touch the network or real storage; anything they stub is restored after each test.
    restoreMocks: true,
    unstubGlobals: true,
    reporters: ci ? ['default', 'github-actions', ['junit', { outputFile: 'reports/junit.xml' }]] : ['default'],
    projects: [
      folder('core', { environment: 'node' }),
      folder('platforms', { environment: 'node', setupFiles: ['src/testing/indexeddb.ts'] }),
      folder('background', { environment: 'node', setupFiles: ['src/testing/indexeddb.ts'] }),
      folder('ui', { environment: 'jsdom' }),
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/**/*.d.ts'],
      reporter: ci ? ['text', 'json-summary', 'lcov'] : ['text-summary', 'html'],
      reportsDirectory: 'coverage',
      // A ratchet: each number sits just under what the tests reach today, so coverage can go up
      // but not quietly slip. Raise them when you add tests.
      thresholds: {
        statements: 46,
        branches: 44,
        functions: 48,
        lines: 47,
        'src/core/**': { statements: 92, branches: 78, functions: 95, lines: 95 },
        'src/background/**': { statements: 90, branches: 85, functions: 45, lines: 95 },
        'src/platforms/**': { statements: 82, branches: 74, functions: 78, lines: 85 },
        // src/ui is mostly reader.ts, a 1,500-line DOM controller that the browser checks in e2e/ drive.
        'src/ui/**': { statements: 29, branches: 28, functions: 28, lines: 30 },
      },
    },
  },
});
