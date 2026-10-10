---
status: Accepted
date: 2026-10-08
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [testing, process]
---

# ADR 0017: Require 100% test coverage of every source file, and delete code no test can reach

## Context

Galley renders hostile input, holds a token, and posts on the reviewer's behalf; most of its code is either a security boundary or a reviewer-visible behaviour. Coverage rose from per-folder ratchets to a 95% floor ([#25](https://github.com/m9rc1n/galley/pull/25)), and the last gaps turned out to be either untested real flows or code no flow could reach.

## Decision

- `vitest.config.ts` requires **100% statements, branches, functions and lines in every source file** (`perFile: true`). Only test files, `src/testing/` and type declarations are excluded.
- **No coverage-ignore comments.** A branch no test can reach is dead code: delete it, or the guard around it, and let the type system or a comment carry the reason it cannot happen.
- Code that depends on the build-time constant `__GALLEY_DEV__` is tested in `*.dev.test.ts`, in its own Vitest project compiled with it on.
- Tests describe behaviour a reviewer would notice ("raw HTML cannot borrow a block id to hide a real edit"), and a bug fix starts with the test that fails.

## Consequences

- **Good:** every change states its behaviour in a test; dead fallbacks disappear instead of accumulating.
- **Costs:** UI changes need jsdom tests for every branch, using the reader harness; some tests exist only to reach error paths.
- **Costs:** running a single Vitest project fails the gate, because other files are not covered; use `npx vitest run --project core` without `--coverage` while iterating.

## Alternatives considered

- **A global percentage floor:** lets new code arrive untested as long as the total holds.
- **Per-folder ratchets:** the previous rule; they only stopped coverage from falling.
- **Allow ignore comments:** convenient, and how dead code survives.

## Enforcement

- `npm run test:coverage` (in `npm run check`, the pre-push hook and CI) fails below 100% in any file.
- The `galley-tests` agent skill explains how to reach a branch, or why to delete it.

## References

- `b421883`, pull request [#31](https://github.com/m9rc1n/galley/pull/31); [codecov.yml](../../codecov.yml).
- [CONTRIBUTING.md, Tests and lint](../../CONTRIBUTING.md#tests-and-lint).
