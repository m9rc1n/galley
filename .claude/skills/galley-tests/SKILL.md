---
name: galley-tests
description: Write and fix Galley's tests under its 100% per-file coverage rule. Use when adding or changing behaviour in src/, when a unit test or the coverage gate fails (locally, in the pre-push hook or in CI), when deciding between a unit test and a browser check, or when code seems unreachable.
---

# Tests in Galley

Every source file is covered 100%: statements, branches, functions, lines. No ignore comments ([ADR 0017](../../../docs/adr/0017-full-coverage-of-every-file.md)). Details in [CONTRIBUTING.md, Tests and lint](../../../CONTRIBUTING.md#tests-and-lint).

## Where a test goes

| Behaviour | Test | Environment |
| --- | --- | --- |
| Pure logic (diffs, parsing, order, paths) | `src/core/<module>.test.ts` | Node |
| Platform requests and errors | `src/platforms/<module>.test.ts` with `mockFetch` | Node, in-memory IndexedDB |
| Worker and token checks | `src/background/worker.test.ts` | Node |
| Rendering and the reader's DOM behaviour | `src/ui/<module>.test.ts`, `src/ui/reader-*.test.ts` | jsdom |
| Development-build marks (`__GALLEY_DEV__`) | `*.dev.test.ts` | jsdom, `dev-build` project |
| Layout, focus, selection, contrast, real fonts | `e2e/*.mjs` | Chrome |
| Scripts (`scripts/*.mjs`) | `scripts/*.test.mjs` with `node --test` | Node |

## Helpers (`src/testing/`, never shipped)

- `reader.ts`: `readerHarness()` opens the reader on a fake source (`review()`), supplies the geometry jsdom lacks (`bounds(el, top)`) and query helpers (`q()`); `guide` and `contents` are a sample document; `deferred()` controls when a promise settles.
- `render.ts`: `renderMarkdown()` renders two versions of a document.
- `http.ts`: `mockFetch()` and `jsonResponse()`.
- `indexeddb.ts`: in-memory IndexedDB (set up per project in `vitest.config.ts`).
- `sandbox.ts`: `connectFrame()` plays the browser's part for a sandbox frame, so frame scripts run against the real client code.

## How to write one

- **Name the behaviour a reviewer would notice:** "raw HTML cannot borrow a block id to hide a real edit", not "test sanitize".
- **Bug fix? Write the failing test first,** then the fix.
- **Drive the public interface:** clicks and keys through the DOM, real Markdown through the renderer. Avoid reaching into private fields.
- **Stub with `vi.stubGlobal`, `vi.spyOn` or `mockFetch`.** Mocks, globals and storage are restored after each test; never assign globals by hand.
- **Async:** use `vi.waitFor()` for things that settle; fake timers for retries and toasts. No sleeps.

## When coverage is below 100%

1. `npm run test:coverage`, then open `coverage/index.html` (or `node scripts/coverage-summary.mjs`) to find the line or branch.
2. Ask: can a real user, document or platform response reach it? If yes, write that test.
3. If nothing can reach it, **delete it** (or the guard around it) and let the types or a comment carry the reason. This is how the codebase got to 100%.
4. Running one project with coverage fails the per-file gate for the others; iterate with `npx vitest run --project ui src/ui/render` and check coverage with the full `npm run test:coverage`.

## Browser checks

`npm run test:e2e` (Chrome; `CHROME_PATH` if needed). Add assertions to the matching file in `e2e/` when a change affects layout, focus, selection, contrast or anything jsdom cannot model. They run against the demo, so add demo content in `demo/` if the scenario needs it.
