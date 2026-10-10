---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [rendering, diffing]
---

# ADR 0003: Parse and compare Markdown in the browser, block by block and then word by word

## Context

A platform diff compares lines. For prose that is the wrong unit: re-wrapping a paragraph changes every line and no words, and a one-word edit hides in a long line. Reviewers need to see the rendered document with the edits marked inside it.

Neither GitHub nor GitLab returns rendered Markdown with source positions, and Galley needs positions twice: to match blocks between versions, and to anchor comments to source lines. Rendering happens in the browser anyway ([ADR 0002](0002-no-server-no-telemetry.md)).

## Decision

- **Parse locally.** Both versions are parsed with markdown-it (GitHub-flavoured tables, task lists, footnotes, alerts, front matter, emoji shortcodes) in `src/core/markdown.ts`. Every leaf block (a *unit*: paragraph, heading, list-item text, table, code block) keeps its source line range.
- **Compare blocks first** (`src/core/blockdiff.ts`). A unit's equality key is its whitespace-normalised text plus its resolved link and image destinations, so re-wrapping is not an edit and a changed link target is. Code and raw HTML compare exactly, because indentation can change their meaning. Unmatched blocks are paired as *edited* when their words are similar enough (Dice coefficient of at least 0.35, looking up to eight blocks ahead).
- **Then compare words** inside each edited pair (`src/core/worddiff.ts`), tokenised with `Intl.Segmenter` so every script splits sensibly, and cleaned up so rewrites read as phrases rather than confetti. A block rewritten by more than 60% shows as the old block removed and the new one added (`REWRITE_RATIO` in `src/ui/render.ts`).
- **Bound the work** (`src/core/limits.ts`). Documents over 2,000,000 characters are not rendered; every diff trims the common prefix and suffix and stops after 2,000 edits or 250 ms, showing the rest as replaced. The answer is less granular, never wrong, and a hostile pull request cannot freeze the tab.
- **Account for invisible changes.** Edits that render nowhere (HTML comments, link definitions) are counted in the file's byline and linked to the platform diff.

## Consequences

- **Good:** edits appear where a reader would notice them; layout-only changes are not noise; comments can be anchored to exact source lines ([ADR 0008](0008-comment-through-platform-review-apis.md)).
- **Costs:** platform-specific syntax renders approximately: GitLab's `[[_TOC_]]`, math and PlantUML show as text or code, and `#123` and `@user` are not linked. The README lists these limitations.
- **Costs:** the parser, diff library and their edge cases are ours to maintain, with tests for hostile input.

## Alternatives considered

- **Ask the platform to render:** no source positions, a request per document, and different output on GitHub and GitLab.
- **A line diff with prose styling:** cheap, but keeps the noise this product exists to remove.
- **Character-level diff:** too fine for prose; word tokens with clean-up read better.

## Enforcement

- Unit tests in `src/core/*.test.ts`, including bounded-work and hostile-input cases in `edges.test.ts` and `limits.test.ts`, at 100% coverage ([ADR 0017](0017-full-coverage-of-every-file.md)).
- The browser checks in `e2e/reader.mjs` assert inserted and deleted words, and the gap between adjacent old and new wording.

## References

- [CONTRIBUTING.md, How Galley works](../../CONTRIBUTING.md#how-galley-works).
- `e941109` (0.1.0); `a20bac7` (0.3.1) added link destinations to block comparison, exact comparison for code and HTML, bounded diffs and counted invisible changes.
