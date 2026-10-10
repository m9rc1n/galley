---
status: Accepted
date: 2026-10-05
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [40, 46, 47]
tags: [review, platforms]
---

# ADR 0008: Post comments and replies through the platforms' own review APIs, and never retry a write

## Context

Reviewers want to comment beside the text they are reading. Their teammates may not use Galley, and the review's record lives on GitHub or GitLab. A comment system of Galley's own would need a server ([ADR 0002](0002-no-server-no-telemetry.md)) and would split the conversation.

## Decision

- Comments are ordinary platform comments: [GitHub review comments](https://docs.github.com/en/rest/pulls/comments#create-a-review-comment-for-a-pull-request) and [GitLab discussions](https://docs.gitlab.com/api/discussions/#create-a-new-thread-in-the-merge-request-diff). Existing threads load with the review and sit beside their paragraphs.
- A comment targets the source lines of the selected block(s), on the old or new side (`CommentTarget` in `src/platforms/types.ts`). When those lines are outside the available diff, the editor says before posting that it will post a quoted file comment (GitHub) or a discussion (GitLab) instead (`CommentPlan.kind`).
- Posting first checks that the reviewed revision is still current. **Writes are never retried automatically**: a failure keeps the draft, and an uncertain result tells the reviewer to check the platform before posting again.
- Replies continue the platform thread. Threads are flat on both platforms, so an answer to a reply joins the same thread and starts with an @mention of the person it answers.
- Drafts live in memory while the reader is open. The reader stays open while a comment is unsent.
- Approving, requesting changes and resolving threads stay on the platform for now (README roadmap).

## Consequences

- **Good:** teammates without Galley read and answer in the tools they use; nothing new to adopt.
- **Good:** no duplicate comments from a retried request that actually succeeded.
- **Costs:** comments anchor to whole source blocks, not words; replies are one level deep, as the platform allows.
- **Costs:** features built on comments (intent labels in [RFC 0046](../rfcs/0046-comment-intent-and-severity.md), handoff notes in [RFC 0047](../rfcs/0047-shared-review-responsibilities.md), a closing view in [RFC 0040](../rfcs/0040-thoughtful-finish.md)) must round-trip through plain platform comments.

## Alternatives considered

- **Galley-only annotations:** richer anchoring, but invisible to the team and dependent on a server.
- **Automatic retry on failure:** convenient, but a timeout after a successful write would post twice.

## Enforcement

- `src/platforms/comments.test.ts`, `github.test.ts` and `gitlab*.test.ts` cover targeting, fallbacks and revision checks; `src/ui/reader*.test.ts` cover drafts surviving failures.
- `e2e/reader.mjs` posts against the demo and checks the payload.
- Reviewers reject any retry loop around a write in `src/platforms/`.

## References

- `a003050` (comments), `3251a8a` (0.5.0, comments beside the text and replies), `6316046` (comment context posted as code).
- [User guide, Comments and replies](../GUIDE.md#comments-and-replies).
