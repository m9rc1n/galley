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
      folder('content', { environment: 'jsdom' }),
      folder('popup', { environment: 'jsdom' }),
      folder('dev', { environment: 'node' }),
    ],
    coverage: {
      provider: 'v8',
      // Keep diagnostic reports when a test fails; the test run still exits unsuccessfully.
      reportOnFailure: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/**/*.d.ts'],
      reporter: ci ? ['text', 'json-summary', 'lcov'] : ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // A ratchet: each number sits just under what the tests reach today, so coverage can go up
      // but not quietly slip. Raise them when you add tests.
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
        'src/core/**': { statements: 99, branches: 94, functions: 100, lines: 99 },
        'src/background/**': { statements: 100, branches: 100, functions: 83, lines: 100 },
        'src/platforms/**': { statements: 99, branches: 99, functions: 97, lines: 100 },
        'src/ui/**': { statements: 98, branches: 94, functions: 97, lines: 99 },
        'src/content/**': { statements: 100, branches: 96, functions: 91, lines: 100 },
        'src/popup/**': { statements: 97, branches: 98, functions: 94, lines: 97 },
        'src/dev/**': { statements: 100, branches: 100, functions: 91, lines: 100 },
      },
    },
  },
});
