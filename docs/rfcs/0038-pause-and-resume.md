---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/38
theme: Never lose the thread
phase: Core, 3 of 3
adrs: [19]
---

# RFC 0038: Pause and resume the reviewer's train of thought

## Problem

Returning to the previous scroll position restores a location, but may not restore the reviewer's intention. After an interruption, they can still spend time reconstructing what they checked and what they planned to check next.

Galley already offers saved-position resume in [#34](https://github.com/m9rc1n/galley/pull/34). This RFC extends that experience with a lightweight checkpoint.

## Proposal

Offer a **pause checkpoint** containing the current location or chapter, explicit review progress, unresolved private follow-ups, and an optional “next thing to check” note.

On return, show a concise invitation to continue, for example: “You were checking the success path. Next: inspect cancellation.” That wording should come from the reviewer's own note or recorded actions, rather than an inferred claim that they understood the code.

Saving and restoring should fit ordinary closing and reopening. A pause action can collect an optional note, while normal position/progress persistence continues without requiring a ritual. The reviewer may resume or start elsewhere.

## Proposed acceptance criteria

- [ ] A reviewer can leave an optional next-step note while saving a checkpoint.
- [ ] Reopening the same review offers the checkpoint and can restore its location.
- [ ] With no next-step note, the return experience uses factual recorded state.
- [ ] Existing Viewed progress and unresolved follow-ups remain accessible after resume.
- [ ] Resuming is optional and does not override a location explicitly chosen by the reviewer.
- [ ] A deleted file, missing chapter or changed revision produces a clear fallback rather than a misleading exact restore.
- [ ] Closing during pending storage work cannot lose an acknowledged save or update a closed reader.
- [ ] Save failures preserve recoverable input and distinguish unsaved from saved state.
- [ ] Keyboard, mobile and reduced-motion behavior are checked; focused asynchronous persistence tests retain existing coverage gates.

## Alternatives and tradeoffs

- **Position resume alone:** already available, but leaves the reviewer's reasoning implicit.
- **Require a pause form every time:** records more context but can make stopping feel like extra work.
- **Infer the next task automatically:** reduces writing, but risks assigning an intention the reviewer did not have.

Start with factual state and an optional authored note. The feature should make leaving easy.

## Open questions

- **Design:** Should pause be a visible action, a keyboard command, or part of the existing resume interaction?
- **Engineering, blocking:** How should checkpoints and private-note storage coordinate acknowledgements and failures?
- **Product:** Is the latest checkpoint sufficient, or do reviewers need a small history?
- **Engineering:** How should a checkpoint remain useful before a full “since my last review” comparison is available?

## Validation

Interrupt 5–8 reviewers at a meaningful point in a real review, then ask them to continue later. Compare time to resume the intended task and accuracy of recalling outstanding checks against position-only resume. Evaluate the pause interaction's effort as well as the return experience. Findings should be collected in research sessions without adding telemetry.

## Sequencing

One of the three proposed core RFCs. Builds on [#34](https://github.com/m9rc1n/galley/pull/34)'s position resume. Coordinate with private follow-ups; chapter integration can be added as chapter navigation becomes available.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point (core)
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions (core)
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review (follow-up)
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review (follow-up)
