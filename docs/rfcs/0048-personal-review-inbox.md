---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/48
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [2, 19]
---

# RFC 0048: A personal review inbox for deliberate workload planning

## Problem

File overload is only one source of review pressure. A reviewer may have several interrupted or waiting reviews across repositories and struggle to decide what to return to.

Existing saved-position history restores a review once it is opened. This proposal makes that pending work visible before the reviewer enters a diff.

## Proposal

Explore a quiet, personal review inbox organized by reviewer-chosen intent: “Next,” “In progress,” “Waiting” and “Later.”

Begin with reviews the user deliberately adds. Each entry can link to its checkpoint, show the reviewer's next step, and distinguish locally recorded state from newly fetched provider metadata. Reordering and removing entries should be simple.

Provider discovery of assigned reviews is a later, opt-in capability. The initial RFC does not require background polling, notifications, automatic deadlines or a server. The reviewer decides what deserves attention; no inferred urgency or performance ranking is needed.

## Proposed acceptance criteria

- [ ] A reviewer can explicitly add, reorder, categorize, open and remove a review.
- [ ] Returning from the inbox can offer the review's existing checkpoint.
- [ ] Local next-step notes remain distinguishable from current provider status.
- [ ] Completed, closed or newly changed reviews are identified when refreshed, without silently discarding unfinished notes.
- [ ] Metadata refresh is explicit and respects provider access, rate limits and authentication failures.
- [ ] Missing access or unavailable metadata does not destroy a saved entry.
- [ ] Stored addresses/identifiers, text, retention and clearing are clearly documented.
- [ ] No external analytics, automatic reminders or background discovery is introduced by default.
- [ ] Keyboard, mobile, empty-state and stale-entry flows are checked.

## Privacy and architecture decisions

An inbox that reopens reviews may need to store review addresses or repository identifiers, extending the current fingerprint-only position-history policy. That change must be explicit rather than described as equivalent to existing history. Start with local storage and deliberate user additions; decide what can be retained and cleared before implementation.

## Alternatives and tradeoffs

Browser bookmarks require little implementation but do not hold review state. Provider inboxes have current assignments but may not include private next-step notes. Automatic prioritization could reduce decisions while making opaque or incorrect urgency judgments.

## Open questions

- **Product, blocking:** Does an inbox inside an extension help more than improving the provider's existing queue?
- **Design:** Should it live in the popup, a dedicated extension page or the reader?
- **Engineering:** What minimal permissions and stored data support reopening entries?
- **Product:** Which states reflect reviewers' real workflow without becoming project management?

## Validation

Ask reviewers to track a real week of pending reviews with a manual prototype. Observe forgotten work, effort choosing a next review and whether the inbox becomes another list to maintain. Compare with their existing bookmarks/provider inbox. Use voluntary research observations and no product telemetry.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0038](0038-pause-and-resume.md) — Pause and resume the reviewer's train of thought
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
