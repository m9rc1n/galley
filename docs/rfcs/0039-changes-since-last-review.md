---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/39
theme: Never lose the thread
phase: Follow-up after the core experience
adrs: [19]
---

# RFC 0039: Show what changed since my last review

## Problem

New commits can force a reviewer to work out which parts of a previously examined MR need another look. Restarting from the whole diff can waste attention, while trusting old progress can leave changed behavior insufficiently examined.

Current local Viewed fingerprints already reset when a file changes. This RFC proposes a coherent re-review experience that explains what changed since a known review baseline.

## Proposal

Let reviewers retain a clearly identified reviewed revision and compare it with the current head. Show additions, edits, deletions and renames since that baseline, with a route through affected files or chapters.

Preserve applicable progress for unchanged content and identify affected areas needing another look. Provide both the incremental comparison and the full current MR diff; reviewers should understand which one they are reading.

Private follow-ups and checkpoints should retain their history. Changed anchors should be marked for reconfirmation rather than silently treated as current.

## Proposed acceptance criteria

- [ ] The reviewer can identify and choose the baseline revision for an incremental comparison.
- [ ] The view clearly labels its baseline and current head, and offers the full current diff.
- [ ] Added, changed, renamed and deleted files are represented.
- [ ] Unchanged review state is preserved; affected state is visibly marked for re-review.
- [ ] Updating local state does not silently mark provider files Viewed or imply approval.
- [ ] Changed note/checkpoint anchors retain the user's text and show when reconfirmation is needed.
- [ ] Unavailable baselines, force-pushed history, incomplete comparisons and fetch failures are distinguished from “no new changes.”
- [ ] The reviewer decides when to advance the baseline.
- [ ] Focused comparison/state tests and browser checks cover the failure paths and retain existing coverage gates.

## Alternatives and tradeoffs

- **Reset all progress on every new head:** easy to reason about but discards useful work.
- **Show only changed files:** cheaper than a full incremental diff, but may still require re-reading large files and can obscure removed content.
- **Keep prior diffs locally:** can enable richer comparisons, but storing repository content changes privacy and retention obligations. Prefer provider-accessible revisions and minimal local metadata where possible.

A file-level version may be a useful first increment if it clearly communicates its limits.

## Open questions

- **Engineering, blocking:** Which provider APIs supply reliable revision comparisons, including rebases and unavailable old commits?
- **Product/design:** What reviewer action establishes or advances a baseline?
- **Engineering:** How should local progress reconcile with native provider Viewed state?
- **Design:** How can the incremental view keep dependencies and unchanged context discoverable?
- **Product/engineering:** What baseline metadata can be retained within the existing privacy model?

## Validation

Use real MRs with an initial review and a subsequent revision. Ask reviewers to identify new work and explain which earlier conclusions still apply. Compare repeated reading and missed consequential edits with the full-diff workflow. Explicitly test rebases, deletions and unavailable baselines. Record results through research sessions, without product telemetry.

## Sequencing

A proposed follow-up. Integrates with review chapters, private follow-ups and checkpoints, while remaining useful with the existing Viewed model.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point (core)
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions (core)
- [RFC 0038](0038-pause-and-resume.md) — Pause and resume the reviewer's train of thought (core)
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review (follow-up)
