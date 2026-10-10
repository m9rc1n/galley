---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/44
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: []
---

# RFC 0044: Review lenses for focused passes through a change

## Problem

A reviewer may be trying to evaluate behavior, compatibility, failure handling and maintainability at the same time. Important questions can be lost as attention switches between concerns.

The existing Focus layout reduces visual distractions. This RFC proposes an optional way to structure the reviewer's examination, independent of layout and file chapters.

## Proposal

Offer a small set of optional review lenses, such as “Behavior,” “Failure paths,” “Compatibility” and “Tests.” A lens supplies a short, editable set of prompts and helps the reviewer keep relevant notes together while reading the same change.

Begin with a few lightweight templates and an ad hoc lens. Applying a lens should be one action, require no onboarding and keep the full change accessible. A reviewer can use one pass or switch freely; there is no mandatory sequence.

Use factual progress and reviewer-authored notes. Completing a lens records that the reviewer chose to finish that pass, rather than certifying that all defects in that category were excluded.

## Proposed acceptance criteria

- [ ] A reviewer can choose, edit or dismiss a lens without changing the underlying diff.
- [ ] Prompts and related private notes remain accessible while navigating files.
- [ ] Switching lenses preserves position and unsent text.
- [ ] All changed files remain discoverable; lens filtering does not silently omit content.
- [ ] Lens completion stays separate from provider Viewed and approval state.
- [ ] Templates are optional and do not require every reviewer to examine every category.
- [ ] Custom text has an explicit local storage/clearing policy if persisted.
- [ ] Keyboard, mobile and empty-state flows are verified.

## Alternatives and tradeoffs

A single checklist is simpler but may grow into a long list with little prioritization. Mandatory review passes provide structure at the cost of friction. Reviewer expertise may make any prompts unnecessary, so the initial experience must be easy to ignore.

The assumption to test is whether a lens supports attention or becomes another task to maintain.

## Open questions

- **Product/design:** Which two or three lenses deserve an initial experiment?
- **Design:** Should prompts remain visible or appear only on request?
- **Product:** Are custom lenses useful for individual reviewers, teams or both?
- **Engineering:** How should notes connect to lenses without fragmenting the private follow-up queue?

## Validation

Compare ordinary review with a single optional lens on changes containing several kinds of issues. Observe missed concerns, repeated reading, prompt fatigue and ability to describe the review's scope. Include experienced reviewers and small MRs. Use manual sessions consistent with the no-telemetry policy.

## Relationship to existing RFCs

Chapters describe which related files to read; lenses describe the question to keep in mind while reading them.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
- [RFC 0043](0043-test-evidence.md) — Connect changed behavior to test evidence
