---
status: Accepted
date: 2026-10-09
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [36]
tags: [review, large-reviews]
---

# ADR 0022: Group review chapters from explainable evidence, editable for the session only

## Context

[RFC 0036](../rfcs/0036-review-chapters.md) proposed review chapters: related files grouped around a concern, with a clear place to start. It warned that a tidy map can hide coupling, and that semantic labels ("Failure handling") should come from people, not guesses. It left open whether reviewer edits should be saved.

## Decision

- **Chapters come from evidence Galley can explain** (`src/core/chapters.ts`): the first two folder levels of each file, documents kept apart from code, tests placed beside their source using the same name and nearest-folder matching as the suggested order ([ADR 0021](0021-suggested-order-and-folded-files.md)), and skippable files in a **Supporting files** chapter. Each chapter states its reason; titles are folder names, not inferred intent.
- **The map accounts for every changed file**: folded files, failed loads, code that is turned off, and formats Galley cannot render (under **Other changed files**, linked to the platform diff and never fetched). **All files** always gives a flat list.
- **Start here** goes to the first unviewed readable file and becomes **Continue here**; reviews with six or more files also get a chapter route and **Next chapter**. Progress counts only explicit Viewed actions.
- **Reviewers can rename, introduce, reorder and regroup chapters**, and create new ones. **Edits last for the open session only.** Reordering keeps reading position, Viewed state, folds and comment drafts; **Reset chapters** restores the suggestion.
- The map opens from **Chapters** in the top bar or <kbd>M</kbd>.

## Consequences

- **Good:** reviewers get a starting point without authors preparing a walkthrough, and can see why files are grouped.
- **Costs:** folder grouping cannot see cross-cutting concerns; reviewers regroup by hand, and their work is lost when the reader closes.
- **Follow-up:** the reviewer pilot, lasting chapter edits (a storage decision, see [ADR 0019](0019-review-progress-as-fingerprints.md)) and detecting truncated platform file lists remain open in RFC 0036.

## Alternatives considered

- **Semantic chapters inferred from the code:** potentially more useful, but wrong groupings would conceal coupling; rejected for the first version, as the RFC advised.
- **Author-defined walkthroughs only:** accurate, but nothing for reviewers until authors do extra work.
- **Persist edits locally:** postponed until a storage and retention policy exists.

## Enforcement

- `src/core/chapters.test.ts`, `src/ui/reader-chapters.test.ts`, and `e2e/chapters.mjs` (focus, accessible names, position-preserving reordering, desktop and 320 and 390 pixel layouts in light and dark).

## References

- `a1dba18`, pull request [#50](https://github.com/m9rc1n/galley/pull/50); [User guide, Review chapters](../GUIDE.md#review-chapters).
