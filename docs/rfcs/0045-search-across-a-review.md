---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/45
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [2, 21]
---

# RFC 0045: Search across a review, including folded content

## Problem

Finding a symbol, test, phrase or discussion in a large MR can require opening many folded sections or leaving the reader. Ordinary browser find may not provide enough context about hidden content, versions or unavailable files.

## Proposal

Add a review-wide search that finds text in available file content, declaration/test names, loaded discussions and private notes. Results identify the file, relevant heading, source version and a compact excerpt.

Selecting a result reveals the necessary context and preserves a return path to the previous reading location. Include filters for changed content and content type, while clearly stating what the current search includes.

Start with a bounded, local search over content Galley already has. Additional provider reads should be an explicit expansion of search scope, respect the code-files preference and report progress, failures and limits.

## Proposed acceptance criteria

- [ ] Search can find content inside available folded sections without manually opening every section.
- [ ] Results distinguish old/new source versions and private/public content.
- [ ] Selecting a result reveals and focuses its actual context, with a route back.
- [ ] Navigation does not silently mark files Viewed or discard drafts.
- [ ] The UI states scope and distinguishes no matches from unsearched/unavailable content.
- [ ] Searching disabled code content does not silently enable Code files or fetch extra files.
- [ ] Large queries/results are bounded and cancellable so the reader remains responsive.
- [ ] Queries and results are processed locally and not sent to an external search service.
- [ ] Keyboard, mobile, hidden-content and partial-load cases are verified.

## Alternatives and tradeoffs

Browser find has low interaction cost but limited review-specific context. A full repository search offers more breadth while introducing permissions, fetching and indexing scope. A command menu could reuse result navigation later, but should not delay a useful text search.

## Open questions

- **Engineering, blocking:** Which content is available without extra reads, and how can search limits be reported accurately?
- **Design:** Should private notes and discussions appear together with code by default?
- **Product:** Are exact text matches sufficient for the first version?
- **Engineering:** What indexing and cancellation strategy keeps large reviews responsive?

## Validation

Give reviewers lookup tasks spanning folded files, an old-version passage, a test and an existing discussion. Measure successful retrieval, time, lost reading position and mistaken interpretations of incomplete search. Include large and partially loaded MRs. Collect these observations through research sessions without product telemetry.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions
- [RFC 0042](0042-inspect-related-code.md) — Inspect related code without losing your place
