import { configDefaults, defineConfig } from 'vitest/config';

const ci = Boolean(process.env.CI);

// Tests live next to the code they cover (src/<folder>/<module>.test.ts). Each folder is its own
// Vitest project, so `vitest --project ui` runs one layer and the report is grouped by folder.
// Shared helpers are in src/testing. The browser-level checks are in e2e/ (npm run test:e2e).
const folder = (name: string, options: { environment: 'node' | 'jsdom'; setupFiles?: string[] }) => ({
  extends: true as const,
  test: { name, include: [`src/${name}/**/*.test.ts`], exclude: [...configDefaults.exclude, DEV_BUILD_TESTS], ...options },
});

// The development build (npm run dev) marks itself in the popup, launcher and reader. Those marks hang on
// a build-time constant, so tests for them (src/**/*.dev.test.ts) run in their own project, built with it on.
const DEV_BUILD_TESTS = 'src/**/*.dev.test.ts';

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
      { extends: true as const, define: { __GALLEY_DEV__: true }, test: { name: 'dev-build', include: [DEV_BUILD_TESTS], environment: 'jsdom' as const } },
    ],
    coverage: {
      provider: 'v8',
      // Keep diagnostic reports when a test fails; the test run still exits unsuccessfully.
      reportOnFailure: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/testing/**', 'src/**/*.d.ts'],
      reporter: ci ? ['text', 'json-summary', 'lcov'] : ['text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // Every source file is fully covered. Code no test can reach is dead code: delete it rather than skip it.
      thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
