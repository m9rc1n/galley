---
status: Draft
created: YYYY-MM-DD
authors: [your-github-handle]
discussion: https://github.com/m9rc1n/galley/issues/NNNN
theme: Never lose the thread
adrs: []
---

# RFC NNNN: What the reviewer gets, in plain words

<!--
Copy this file to docs/rfcs/NNNN-short-title.md, where NNNN is the number of the issue that tracks the
discussion. Keep every section; write "None" rather than deleting one. Delete these comments.
-->

## Problem

Who is struggling, with what, and when. Say what Galley already does about it, linking the feature or pull request, and why that is not enough. Benefits are hypotheses until validated: say so.

## Proposal

What changes for the reviewer, described through what they see and do. Start with the smallest version that would test the idea. Say what stays the same: the full file list, existing settings, explicit Viewed and posting actions.

## Proposed acceptance criteria

- [ ] Behaviour a reviewer could check, one per line.
- [ ] Failure states: offline, permission errors, changed revisions, storage failures. Nothing claims success it did not have.
- [ ] Keyboard, screen reader names, phones (320 and 390 pixels), dark appearance and reduced motion are verified.
- [ ] Focused unit tests and browser checks; the 100% coverage gate stays intact.

## Privacy and data decisions

What is stored, where, for how long and how it is cleared; what is sent and to whom. "Nothing new" is a valid answer. Anything new needs a PRIVACY.md update before it ships. See [ADR 0002](../adr/0002-no-server-no-telemetry.md) and [ADR 0019](../adr/0019-review-progress-as-fingerprints.md).

## Alternatives and tradeoffs

- **Do nothing / keep today's behaviour:** what it costs reviewers.
- **Another approach:** why it is weaker or stronger.

## Open questions

- **Product / Design / Engineering, blocking or not:** the question, and what would answer it.

## Validation

How we will learn whether it helps: tasks, five to eight reviewers on real reviews, compared with today's experience. Research sessions only; Galley has no telemetry.

## Sequencing

What it builds on, what it unblocks, and what can ship first.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — how it relates, for example: "chapters give this proposal its anchors".
