---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/47
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [2, 8]
---

# RFC 0047: Shared review responsibilities and explicit handoffs

## Problem

When several people review a large MR, responsibilities can remain implicit. Everyone may inspect the same familiar files while assuming someone else has examined a difficult area.

A useful team experience needs to distinguish a person's stated review scope from evidence that the whole change has been adequately reviewed.

## Proposal

Let reviewers explicitly state a scope they plan to examine, such as a chapter, selected files or an aspect of the change. Show claimed scopes, acknowledged completion and unclaimed areas, with author-maintained links to relevant review discussions.

Start with a reviewer-authored handoff note that can be previewed and deliberately shared through an existing provider discussion. Explore a synchronized responsibility map only after confirming provider support and team value.

A handoff should explain what was examined, which revision it refers to and what remains uncertain. Private follow-ups are included only when the reviewer explicitly selects them for sharing. Another person's responsibilities are never inferred from their name, expertise or Viewed status.

Google's guidance calls for making the scope of a partial review explicit. A shared responsibility map is our proposed extension of that principle. [Review scope guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html)

## Proposed acceptance criteria

- [ ] Reviewers can describe their own scope and identify the revision examined.
- [ ] Planned work, acknowledged completion and unclaimed work remain distinct.
- [ ] Overlap and gaps can be inspected without declaring the MR safe or ready automatically.
- [ ] Shared notes show their author, scope and revision.
- [ ] Private content is excluded unless explicitly selected for publication.
- [ ] Publishing is an intentional action with destination/text preview and recoverable failure handling.
- [ ] New revisions identify scopes that may need reconfirmation.
- [ ] Unsupported providers offer a transparent handoff-text fallback.
- [ ] A synchronized version, if pursued, must handle conflicting updates without silently losing claims.

## Alternatives and tradeoffs

Provider reviewer assignments identify people but may not capture a precise scope. A public checklist is lightweight but can become stale. A live map is richer but introduces coordination, permissions and synchronization work.

The first experiment should establish whether explicit handoff notes help enough to justify shared state.

## Open questions

- **Product:** Do teams need file ownership, aspect ownership or both?
- **Engineering, blocking for shared state:** Where can responsibilities be stored within supported provider permissions and Galley's serverless model?
- **Design:** How should a reviewer withdraw or revise a claim?
- **Product:** Who maintains the overall scope, and how should cross-cutting concerns be represented?

## Validation

Observe small review teams working on the same large MR. Compare duplicated effort, unclaimed areas, handoff clarity and revision confusion with their existing process. Research should evaluate collaboration quality without collecting individual productivity scores or adding product telemetry.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0036](0036-review-chapters.md) — Review chapters with a clear starting point
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
- [RFC 0039](0039-changes-since-last-review.md) — Show what changed since my last review
