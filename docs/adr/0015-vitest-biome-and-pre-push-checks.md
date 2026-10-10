---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [process, testing, tooling]
---

# ADR 0015: Test per folder with Vitest, lint and format with Biome, and check every pushed commit

## Context

Tests first ran on `node --test` from a root `test/` folder, which depended on the TypeScript compiler API that TypeScript 7 no longer provides. ESLint with typescript-eslint was not an option on TypeScript 7 either. Formatting was not enforced, and failures surfaced only in CI.

## Decision

- **Vitest**, with tests next to the code they cover (`src/core/markdown.ts` → `src/core/markdown.test.ts`). Each folder is its own project (`core`, `platforms`, `background`, `ui`, `content`, `popup`, `dev`, plus `dev-build` for `*.dev.test.ts`), so one layer can run alone. Node environment for `core`, `platforms`, `background` and `dev`; jsdom for `ui`, `content` and `popup`. Mocks, globals and storage are restored after every test. Shared helpers live in `src/testing/` and never ship.
- **Biome** lints (recommended rules plus `noFloatingPromises`) and formats (two spaces, single quotes, trailing commas, 160-character lines). One custom rule, `lint/no-unsanitized-html.grit`, guards the sanitiser ([ADR 0006](0006-sanitise-all-rendered-html.md)). Suppressions need a reason.
- **Browser checks** in `e2e/` drive the real reader in Chrome with Puppeteer for what jsdom cannot see: layout, focus, selection, contrast.
- **`npm run check`** runs types, lint, formatting, unit tests with coverage ([ADR 0017](0017-full-coverage-of-every-file.md)), the Pages publisher tests and the documentation check ([ADR 0001](0001-record-decisions-and-proposals.md)). A **pre-push hook** (`.githooks/pre-push`, enabled by `npm install`) runs it on each pushed commit in a temporary worktree, so uncommitted files cannot hide a failure.
- CI runs the same checks on Node 22 and 24, plus the build, the browser checks and `npm audit`.

## Consequences

- **Good:** fast, local feedback that matches CI; one formatter, no style debates.
- **Costs:** a push takes about 15 seconds longer; `git push --no-verify` exists for emergencies.

## Alternatives considered

- **Keep `node --test`:** no TypeScript-aware runner without the compiler API.
- **ESLint + Prettier:** not compatible with TypeScript 7 at the time; two tools instead of one.

## Enforcement

- `vitest.config.ts`, `biome.jsonc`, `.githooks/pre-push`, `scripts/install-hooks.mjs`, `.github/workflows/ci.yml`.

## References

- `00bf166` (Vitest and Biome), `2be0281` (pre-push hook and formatting, pull request [#28](https://github.com/m9rc1n/galley/pull/28)).
- [CONTRIBUTING.md, Tests and lint](../../CONTRIBUTING.md#tests-and-lint).
