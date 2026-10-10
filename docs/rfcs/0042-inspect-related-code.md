---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/42
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [2, 20]
---

# RFC 0042: Inspect related code without losing your place

## Problem

A reviewer may need an unchanged definition, a related test or a caller to understand a changed line. Opening another page can interrupt the reading path and make returning to the original question harder.

Galley already reveals context within changed files. This proposal addresses excursions into related files and declarations.

## Proposal

Provide an on-demand context preview beside the current reading location, with a single-column equivalent on narrow screens. A preview can open a referenced file/declaration or a related test at the relevant revision, then return to the exact starting location.

Start with explicit file references, existing source/test associations and a bounded declaration lookup for supported syntax. Display the origin and revision of every preview. Distinguish a verified link from a text-search candidate.

A broader caller index should remain a later decision: the initial version must not imply it has found every caller or dependency.

Google's review guidance encourages examining a change in the context of the surrounding file and wider system. The proposed preview interaction is our hypothesis for making that examination easier. [Review context guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

## Proposed acceptance criteria

- [ ] A reviewer can open supported related context and return with position, selection and draft text preserved.
- [ ] Every preview identifies its file, source version and revision.
- [ ] Fetches occur on demand against the supported review provider; fetched repository content is kept in memory by default.
- [ ] Ambiguous matches remain candidates; missing context and permission failures are explained.
- [ ] Nested excursions have a bounded, navigable return path.
- [ ] The preview never executes repository code or changes Viewed state.
- [ ] Unsupported languages/references offer a clear source-navigation fallback.
- [ ] Keyboard, mobile, async cancellation and changed-revision cases are verified.

## Alternatives and tradeoffs

Opening provider tabs is familiar but spreads context across pages. A full repository browser offers more reach but creates substantial indexing and navigation scope. Start with narrow, evidence-backed links before considering a broader index.

## Open questions

- **Engineering, blocking:** Which reference forms can be resolved reliably without a full language server?
- **Design:** Does a side preview, overlay or inline expansion best preserve attention?
- **Engineering:** How should stale revisions and unavailable unchanged files be handled?
- **Product:** Is declaration lookup necessary for the first experiment, or are file/test previews enough?

## Validation

Give reviewers tasks that require examining a definition and a related test. Observe navigation effort, position recovery, mistaken reference matches and ability to explain the behavior. Compare with normal provider-tab navigation using comparable tasks. Research observations should not require product telemetry.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions
- [RFC 0045](0045-search-across-a-review.md) — Search across a review, including folded content
