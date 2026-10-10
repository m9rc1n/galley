---
status: Accepted
date: 2026-10-05
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [37, 38, 39, 48, 49, 55]
tags: [privacy, review]
---

# ADR 0019: Keep review progress on the device as fingerprints, and sync it only with GitHub's own Viewed state

## Context

Reviewers mark files as viewed, and on large reviews they come back over several sittings. Remembering progress means storing something about what they reviewed. Without a server ([ADR 0002](0002-no-server-no-telemetry.md)) it can only live in the browser, where other extensions, backups and shared machines may see it. GitHub has a native, per-user Viewed state; GitLab's is not available through its API.

## Decision

- **With a GitHub token**, Viewed reads and updates GitHub's native state (GraphQL `markFileAsViewed` and `unmarkFileAsViewed`), after checking the review revision is current. A failure keeps the previous state and says so.
- **Otherwise** (no token, and on GitLab), Viewed is stored in extension storage under `galley:viewed:<sha256>`, a fingerprint of the review address, the file's paths and status, and **both versions' contents** (`src/ui/viewed.ts`). A changed file gets a new key, so progress resets for that file only. No content is stored.
- **Reading position** ("pick up where you left off") keeps, per review, a fingerprint of the review address, a fingerprint of the file's path, a scroll offset and a time, for the **50 most recent reviews** (`galley:positions`, `src/ui/positions.ts`). Never the address or path themselves.
- The Viewed button's tooltip says where progress is saved. Save failures are surfaced, never reported as saved.
- Only explicit actions count as progress: marking Viewed. Scrolling does not.

## Consequences

- **Good:** nothing readable about what was reviewed is kept; a file that changes after review is offered again.
- **Costs:** fingerprints cannot be listed or shown back, so features that need to name a review (an inbox, [RFC 0048](../rfcs/0048-personal-review-inbox.md)) or keep authored notes ([RFC 0037](../rfcs/0037-private-follow-ups.md), [RFC 0038](../rfcs/0038-pause-and-resume.md)) need a new, explicit storage decision and a PRIVACY.md update. That decision would supersede or extend this ADR.
- **Costs:** "since my last review" ([RFC 0039](../rfcs/0039-changes-since-last-review.md)) cannot be rebuilt from local fingerprints alone.

## Alternatives considered

- **Store review URLs and paths in plain text:** enables history and inboxes, but keeps a readable record of private work.
- **Local progress everywhere, even with a token:** ignores the state teammates see on GitHub.

## Enforcement

- `src/ui/viewed.test.ts`, `src/ui/positions.test.ts`, `src/platforms/github-viewed.test.ts` and the resume tests in `src/ui/reader-large.test.ts`.
- [PRIVACY.md](../../PRIVACY.md) (Viewed progress, Reading position) and [the storage inventory](../architecture/storage.md) must match the code; reviewers treat a new key as a privacy change.

## References

- `4057642` (Viewed), `a20bac7` (native GitHub Viewed), `3b3f9d7` (reading positions, pull request [#34](https://github.com/m9rc1n/galley/pull/34)).
