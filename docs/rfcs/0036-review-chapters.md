---
status: Accepted
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/36
theme: Never lose the thread
phase: Core, 1 of 3
implemented-in: [https://github.com/m9rc1n/galley/pull/50]
progress: Initial slice merged in pull request 50; reviewer pilot, lasting chapter edits and truncated-list detection are open
adrs: [21, 22]
---

# RFC 0036: Review chapters with a clear starting point

## Problem

A reviewer opening a large MR needs to understand how its files relate before deciding where to start. A flat list can leave them repeatedly choosing the next file while holding the change's structure in their head.

Galley's suggested reading order, file folding and file navigation in [#34](https://github.com/m9rc1n/galley/pull/34) provide a foundation. This RFC proposes a map of meaningful review units on top of those controls. The expected benefit is a hypothesis to validate with reviewers, rather than an established result.

## Proposal

Introduce **review chapters**: related files grouped around a concern, such as “New contract,” “Implementation,” “Failure handling,” and “Tests.”

Offer a clear starting chapter and a quiet next-step action. Keep the complete file map available throughout. A reviewer should be able to inspect and change a proposed grouping, or continue with the existing file order.

Start with transparent grouping based on available evidence, including existing source/test associations and directory relationships. Use factual labels for inferred groups; semantic labels should come from explicit author or reviewer input when the evidence does not support them. Explain why files were grouped together.

Optional chapter introductions can describe intent and things to examine. The initial experience must work without authors preparing a walkthrough.

## Proposed acceptance criteria

- [ ] The map accounts for every changed file, including unmatched, folded and failed-to-load files.
- [ ] Each chapter shows its files and offers a starting point and a next step.
- [ ] Reviewers can adjust grouping/order and return to the full file list.
- [ ] Navigation preserves the reader's position and existing Viewed/fold behavior.
- [ ] Chapter progress reflects explicit reviewer actions; scrolling through content does not mark it reviewed.
- [ ] Small reviews remain easy to read without a chapter setup step.
- [ ] Keyboard navigation, screen-reader labels and mobile rendering are verified.
- [ ] Representative cross-cutting changes, renames, generated files and source/test pairs are covered by focused tests and browser checks; existing coverage gates stay intact.

## Alternatives and tradeoffs

- **Keep only suggested file order:** simpler, but provides little explanation of relationships across multiple files.
- **Author-defined walkthrough only:** potentially more accurate, but depends on extra author work before reviewers benefit.
- **Automatically infer semantic chapters:** potentially useful, but incorrect grouping can conceal important coupling. Start with explainable rules and test grouping quality before choosing a more ambitious approach.

The central risk is giving a tidy map that makes the change harder to understand. Related files outside the current chapter must stay discoverable.

## Open questions

- **Product/design:** What is the smallest useful chapter map, and when should it appear by default?
- **Engineering:** Which grouping signals are reliable across the supported providers and languages?
- **Product:** Should reviewer edits be saved privately, and should author walkthroughs be supported in a later version?
- **Design:** How should relationships between chapters be shown without crowding the reading surface?

## Validation

Prototype with 5–8 reviewers on real large MRs. Observe how they choose a starting point, locate related tests and explain the change's structure. Compare orientation time and missed relationships with the existing file-order experience using comparable tasks. Include small MRs to detect added friction. Record findings through a research session; this RFC does not propose adding product telemetry.

## Sequencing

One of the three proposed core RFCs. Build on [#34](https://github.com/m9rc1n/galley/pull/34). Chapter identifiers should be usable by private follow-ups and richer resume checkpoints.

## Related RFCs

- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions (core)
- [RFC 0038](0038-pause-and-resume.md) — Pause and resume the reviewer's train of thought (core)
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review (follow-up)
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review (follow-up)
