---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/40
theme: Never lose the thread
phase: Follow-up after the core experience
adrs: [8, 21]
---

# RFC 0040: A thoughtful finish for a review

## Problem

At the end of a review, unanswered questions, unexamined areas and draft comments may be scattered across the reading session. A reviewer needs to make an intentional decision and explain the basis of their judgment.

File completion alone does not establish that the change is understood or correct.

## Proposal

Introduce a quiet **closing view** that gathers:
- Unresolved private follow-ups.
- Files or chapters the reviewer has not explicitly marked reviewed.
- Draft public comments, with their destinations.
- An optional reviewer-authored summary of what they checked and what still concerns them.

The reviewer can revisit context, resolve a thought, edit a draft, continue reading, or proceed to an explicit provider review action where supported.

Keep “examined,” “folded/skipped,” and “unresolved” distinct. Any assembled summary should be traceable to the reviewer's own notes and actions, editable, and free of inferred correctness claims.

## Proposed acceptance criteria

- [ ] The closing view accounts for unresolved questions, remaining review areas and available draft comments.
- [ ] Each item offers a return path to its context.
- [ ] Folded files are not presented as reviewed solely because they were folded.
- [ ] Reviewers can edit or remove summary text and drafts before publication.
- [ ] Private notes remain private unless the reviewer explicitly selects text for publication.
- [ ] Publication or approval requires an explicit action; opening or completing the view never posts anything.
- [ ] Unsupported provider actions and submission failures preserve drafts and make the result clear.
- [ ] The reviewer can leave with unfinished work and resume later.
- [ ] Empty states, changed revisions, keyboard and mobile flows are checked; focused tests retain existing coverage gates.

## Alternatives and tradeoffs

- **A completion percentage only:** compact, but does not capture uncertainty or communicate what was checked.
- **Use only the provider's submit dialog:** familiar, but cannot naturally include Galley's private follow-ups and checkpoints.
- **An automatically generated verdict:** convenient, but can overstate understanding or invent a rationale. Start with factual state and reviewer-authored text.

The closing view should support judgment without adding pressure to finish.

## Open questions

- **Design:** Should the view appear only on request, or be offered after the last review area?
- **Product:** Which items should remain visible when the reviewer intentionally leaves something unchecked?
- **Engineering, blocking for publication:** Which providers support preserving and submitting the relevant drafts/review actions?
- **Product/design:** Is a simple checklist enough for the first version, with summary composition added later?

## Validation

Have reviewers close real review sessions using a prototype. Check whether they can identify unfinished work, communicate what they examined and preserve private reasoning. Observe accidental disclosure risks, missed questions and interaction burden. Assess clarity alongside review quality in research sessions; do not infer readiness from progress counts.

## Sequencing

A proposed follow-up. Integrates with private follow-ups, review chapters and checkpoints. A local closing checklist can be considered before broader provider submission support.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point (core)
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions (core)
- [RFC 0038](0038-pause-and-resume.md) — Pause and resume the reviewer's train of thought (core)
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review (follow-up)
