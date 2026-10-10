---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/41
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: []
---

# RFC 0041: A review brief that explains intent and constraints

## Problem

A file list tells a reviewer where changes are, but not always what outcome the author intends or which constraints matter. Beginning without that context can send the reviewer down the wrong path.

Galley can already show the MR title and description. This proposal adds a compact, structured orientation aid without replacing the original description.

## Proposal

Offer an optional review brief containing:
- The intended outcome and expected behavior.
- Constraints or decisions the author wants preserved.
- Areas needing particular attention.
- Questions the reviewer still needs answered.

Let reviewers extract passages from the description or discussions, attach source links, and add their own interpretation. Distinguish author statements from reviewer notes. Keep every field optional and preserve access to the original source.

Start with user-selected text and manual entries. Automatic synthesis is a separate decision requiring validation of accuracy and provenance. A brief should help someone begin reading, without requiring an author walkthrough or a setup form.

## Proposed acceptance criteria

- [ ] The brief can be opened, skipped, edited and collapsed without blocking review.
- [ ] Sourced statements link back to their description or discussion context.
- [ ] Reviewer notes are visibly distinguished from author-provided intent.
- [ ] Missing intent or constraints remain unknown; the UI does not invent them.
- [ ] A changed source/revision can be identified so an older brief is not presented as freshly verified.
- [ ] Any persisted private text has an explicit local storage, clearing and retention policy.
- [ ] Original title/description display and small-review reading remain available.
- [ ] Keyboard and mobile flows, empty states and stale sources are covered by focused checks.

## Alternatives and tradeoffs

Showing only the original description requires less structure but can leave crucial intent buried. An author-only template can improve quality but adds work before reviewers benefit. Automatic summaries reduce effort while risking omissions and unjustified certainty.

The key hypothesis is that a short brief improves orientation enough to justify maintaining it.

## Open questions

- **Product/design:** Which fields help reviewers start, and which merely duplicate the description?
- **Engineering:** What revision/source metadata is sufficient to signal staleness?
- **Product:** Should a reviewer share a brief with the author, or keep the first version entirely private?
- **Design:** How can the brief stay available without taking over the reading surface?

## Validation

Prototype with reviewers on real MRs with both clear and incomplete descriptions. Measure time to explain the intended change, misunderstood constraints and effort spent composing the brief. Compare against title/description alone. Collect observations in research sessions, without adding product telemetry.

## Relationship to existing RFCs

Review chapters organize the route through files; this brief explains the purpose of the change before choosing that route.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
