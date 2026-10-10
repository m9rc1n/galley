---
status: Accepted
date: 2026-10-09
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [36, 40, 45]
tags: [review, large-reviews]
---

# ADR 0021: Suggest a reading order and fold files most reviewers skip, always reversibly

## Context

Large reviews are often large because of lockfiles, generated code, snapshots and code that only moved. The platform lists files alphabetically, so a test is read before the code it tests and a 3,000-line lockfile sits between two design documents. Reviewers spend attention working out what to skip.

## Decision

- **Suggested reading order** (the default; `src/core/order.ts`): documents first, then each source file followed by its tests, then the files most reviewers skip. Tests are matched to their code by name and nearest folder (`quota.test.ts`, `quota_test.go`, `test_quota.py`, `QuotaTest.java`, or `quota` in `__tests__`). **As listed** keeps the platform's order.
- **Folded files** (`src/core/quiet.ts`): lockfiles, minified files and `dist` output, vendored code, generated files (by name, folder, or an `@generated` or `DO NOT EDIT` marker in the first five lines), test snapshots, SVG images, whitespace-only edits (except where indentation is meaning: Python, YAML, Makefiles) and unchanged renames start as one line that says what the file is, why it is folded and how much changed.
- **A file with a discussion never folds**, even when the discussion loads later.
- **Everything is reversible and visible:** **Show changes** opens a folded file; **Settings → Review → Fold files you can skip** turns folding off; the document menu tags and counts folded files. Folding is never progress: a folded file is not Viewed.
- Moved code gets its own tint and a note at each end, and the declaration list names what changed in JavaScript and TypeScript files.

## Consequences

- **Good:** attention goes to the parts that need it, with the reasons on screen.
- **Costs:** heuristics are path- and content-based and will sometimes fold a file someone wanted; the setting and **Show changes** are one step away.
- **Follow-up:** review chapters ([ADR 0022](0022-review-chapters-from-evidence.md)) reuse the same test matching; search across folded content ([RFC 0045](../rfcs/0045-search-across-a-review.md)) and a closing view ([RFC 0040](../rfcs/0040-thoughtful-finish.md)) must keep folded distinct from reviewed.

## Alternatives considered

- **Hide skippable files:** quieter, but hides changes; folding keeps them one click away.
- **Learn what to skip from usage:** needs telemetry ([ADR 0002](0002-no-server-no-telemetry.md)).

## Enforcement

- `src/core/order.test.ts`, `src/core/quiet.test.ts`, `src/ui/reader-large.test.ts`, `src/ui/moves.test.ts` and `e2e/large.mjs`.

## References

- `c33a240` and `3b3f9d7`, pull requests [#32](https://github.com/m9rc1n/galley/pull/32) and [#34](https://github.com/m9rc1n/galley/pull/34); [User guide, Large reviews](../GUIDE.md#large-reviews).
