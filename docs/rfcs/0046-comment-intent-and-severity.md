---
status: Proposed
created: 2026-10-10
authors: [m9rc1n]
discussion: https://github.com/m9rc1n/galley/issues/46
theme: Never lose the thread
phase: Exploratory follow-up; outside the three proposed core RFCs
adrs: [8]
---

# RFC 0046: Comment drafts that make intent and severity clear

## Problem

A comment can accurately identify a concern yet leave its author unsure why it matters or whether the reviewer expects a required change. Reviewers may also struggle to turn a tentative thought into concise, constructive feedback.

Galley already supports anchored comments and in-session drafts. This proposal improves composition and clarity rather than introducing another comment system.

## Proposal

Offer optional drafting prompts for “Observation,” “Why it matters” and “Suggested next step,” plus an explicit comment intent such as question, suggestion, required change or appreciation.

Keep ordinary free-form writing available. The reviewer controls all text and whether any intent label appears in the published comment. A preview shows the exact message and destination before posting.

Start with local templates and user-authored text. Automatic tone rewriting, inferred severity and external generation services are separate decisions. The tool should help reviewers express judgment without assuming it for them.

Google's guidance recommends courteous comments, explaining reasoning and distinguishing mandatory changes from suggestions. These principles inform the proposed prompts; whether the interaction helps needs validation. [Writing review comments](https://google.github.io/eng-practices/review/reviewer/comments.html)

## Proposed acceptance criteria

- [ ] Reviewers can use plain text or optional prompts without completing a form.
- [ ] Intent/severity is selected by the reviewer and can be cleared.
- [ ] The published-text preview matches what will be sent, including any visible label.
- [ ] Anchors and source versions remain clear, including provider fallback destinations.
- [ ] No automatic rewrite, publication or conversion of private notes occurs.
- [ ] Existing revision checks, failed-post draft preservation and uncertain-result handling remain intact.
- [ ] A question label does not silently request changes or alter the provider's review verdict.
- [ ] Keyboard, mobile, conversion and failure flows are covered by focused checks.

## Alternatives and tradeoffs

Prefixes alone provide clarity with little UI. A structured composer can be helpful but risks verbose, formulaic comments. Automatic rewriting may change meaning or blur reviewer authorship. Prefer a small optional helper and measure its burden.

## Open questions

- **Design:** Are a few examples/prefixes more useful than separate prompt fields?
- **Product:** Which intent labels translate well across team conventions?
- **Engineering:** How can optional fields round-trip to plain Markdown without losing edits?
- **Product/design:** Should a private follow-up offer this helper when the reviewer chooses to publish it?

## Validation

Have reviewers draft feedback for actual concerns, then ask authors to interpret the issue and expected response. Compare clarity, editing effort and unintended escalation with the current free-form composer. Include appreciative and informational comments. Use manual research sessions without adding telemetry.

## Implementation quality

If accepted, preserve existing coverage gates and verify the relevant desktop, mobile and accessibility behavior. Validation findings should decide the final scope; these RFCs do not commit the core milestone to shipping every proposal.

## Related RFCs

- [RFC 0037](0037-private-follow-ups.md) — Private follow-ups for review questions
- [RFC 0040](0040-thoughtful-finish.md) — A thoughtful finish for a review
- [RFC 0043](0043-test-evidence.md) — Connect changed behavior to test evidence
