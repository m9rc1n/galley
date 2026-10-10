---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/37
theme: Never lose the thread
phase: Core, 2 of 3
adrs: [2, 19]
---

# RFC 0037: Private follow-ups for review questions

## Problem

Reviewers encounter questions before they have enough context to write a considered public comment. Keeping those questions in memory makes interruptions costly; posting every tentative thought can create avoidable discussion noise.

Give unfinished thinking a private place to live while the reviewer continues reading.

## Proposal

Allow a reviewer to mark a passage, changed hunk or file for follow-up and optionally attach a short note, such as “Does this handle retries?”

Provide a quiet queue that returns to the relevant context. Notes can be edited, resolved, reopened or deleted. A follow-up is separate from a file's Viewed state: a reviewer may have examined a file and still have a question about it.

Keep notes private on the reviewer's device by default. Turning a note into a public comment must be an explicit action with an opportunity to review the destination and text. A marker alone should be useful; writing a note should be optional.

## Proposed acceptance criteria

- [ ] Reviewers can add a marker with or without a note, then edit, resolve, reopen and delete it.
- [ ] The queue shows unresolved questions and returns to their anchored context.
- [ ] Notes survive closing and reopening the same review according to an explicit retention policy.
- [ ] Follow-up state stays separate from Viewed and folding.
- [ ] A changed or missing anchor is identified clearly; a note is never silently attached to unrelated code.
- [ ] No note is sent to a provider or external service without an explicit publishing action.
- [ ] Reviewers can clear saved notes and understand where they are stored.
- [ ] Storage failures are visible, preserve the current note text for recovery and do not imply that saving succeeded.
- [ ] Keyboard and mobile creation/revisit flows are verified, with focused persistence and anchor-change tests; existing coverage gates stay intact.

## Privacy and data decisions

Current reading-position and local Viewed storage use fingerprints rather than stored file content. Persisting user-authored notes would introduce a new kind of stored content and needs an explicit storage and retention design before implementation.

Prefer fingerprinted review/file identifiers and avoid copying source snippets by default. Update the privacy policy to describe note text, retention, clearing and publication behavior. Hashing identifiers does not make note text non-sensitive.

## Alternatives and tradeoffs

- **Bookmarks only:** minimal storage and interaction, but loses the reason for revisiting.
- **Public draft comments only:** closer to the provider workflow, but tentative reasoning is not always intended for publication.
- **An unanchored scratchpad:** flexible, but creates work to find the relevant context again.

## Open questions

- **Engineering, blocking:** What anchor representation remains reliable across revisions, renames and unavailable content?
- **Product/engineering, blocking:** What retention and clearing policy is appropriate for private notes? Position-history limits should not silently delete authored notes.
- **Design:** How can unresolved thoughts remain available without creating another demanding sidebar?
- **Product:** Should note-to-comment conversion be in the initial version or a follow-up?

## Validation

Ask 5–8 reviewers to leave tentative questions while reviewing real MRs, interrupt the task, then have them return. Observe lost questions, unnecessary public comments, context recovery and whether the queue feels helpful or burdensome. Use manual research observations consistent with Galley's no-telemetry policy.

## Sequencing

One of the three proposed core RFCs. Can begin with file/hunk anchors and integrate with review chapters when available. Provides the unresolved-question state needed by checkpoints and the closing view.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point (core)
- [RFC 0038](0038-pause-and-resume.md) — Pause and resume the reviewer's train of thought (core)
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review (follow-up)
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review (follow-up)
