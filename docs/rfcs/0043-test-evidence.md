---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/43
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [20]
---

# RFC 0043: Connect changed behavior to test evidence

## Problem

Seeing a source file beside its tests does not establish which changed behaviors the tests actually exercise. Reviewers still need to examine assertions, setup, omissions and meaningful failure cases.

Galley already renders JavaScript/TypeScript tests as a plan and pairs test files with source files. This proposal adds an explicit relationship between a behavior being reviewed and the evidence supporting it.

## Proposal

Allow reviewers to describe a changed behavior and link it to relevant test cases, assertions, setup or author-provided demonstration notes.

Present a small evidence map: “Behavior to check → Relevant evidence → Outstanding question.” Links can be suggested from existing source/test associations, but the reviewer confirms what they demonstrate.

Keep source and setup accessible. Clearly separate a test's presence, a reviewer-confirmed relationship and an actual execution result. Galley currently does not run tests; this RFC does not propose running repository code in the extension.

Google's review guidance emphasizes inspecting the validity and usefulness of tests, including whether they fail when the behavior breaks. The map is our proposed aid for that judgment, rather than proof of coverage. [Reviewing tests](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

## Proposed acceptance criteria

- [ ] A reviewer can add a behavior, link supporting evidence and record an unresolved question.
- [ ] Links return to the relevant test/assertion and expose setup and raw source.
- [ ] Unlinked behavior means “no evidence linked,” rather than “untested.”
- [ ] Suggested relationships can be corrected or dismissed.
- [ ] Skipped, pending or removed tests remain distinguishable from active source declarations.
- [ ] No pass result, coverage percentage or correctness claim is inferred from static links.
- [ ] Changed evidence is marked for reconfirmation when the revision changes.
- [ ] Unsupported tests remain inspectable as source.
- [ ] Focused mapping, stale-link, keyboard and mobile checks cover the first supported scope.

## Alternatives and tradeoffs

A simple related-test list is cheaper but does not explain what a test establishes. Static coverage inference would automate more while introducing misleading conclusions. Provider CI results can be useful later, but passing checks alone do not answer the reviewer's behavioral question.

## Open questions

- **Product/design:** Is a manual behavior map useful enough without automatic suggestions?
- **Engineering:** What stable identifiers can reference individual cases across edits?
- **Product:** Should linked demonstration notes appear alongside tests in the first version?
- **Design:** How many evidence links can be shown without overwhelming the test plan?

## Validation

Use changes with happy-path tests, meaningful edge cases and deliberately weak assertions. Observe how accurately reviewers explain what the evidence supports and identify remaining uncertainty. Compare against the current source/test pairing. Record understanding and missed issues alongside interaction effort in manual research sessions.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
- [RFC 0042](0042-inspect-related-code.md) — Inspect related code without losing your place
