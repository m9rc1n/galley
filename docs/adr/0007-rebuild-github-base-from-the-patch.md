---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [platforms, github]
---

# ADR 0007: Load GitHub head files from the page's origin and rebuild base versions from the pull request patch

## Context

Galley needs both versions of every changed document. Without a token, GitHub allows 60 API requests an hour per IP address, and public repositories should work with no setup. Fetching both versions of each file through the contents API would spend that budget in one large review. GitHub's pull request files API already returns each file's patch (hunks without headers), and the same-origin `/{owner}/{repo}/raw/{sha}/{path}` URL serves file contents with the browser session and costs no API quota.

GitLab is different: the signed-in session reaches its API and raw files directly, at both the merge base and the head commit, so it simply loads both.

## Decision

- **GitHub** (`src/platforms/github.ts`): list the changed files through the API (100 per page, up to 10 pages), fetch each head version from the same-origin raw URL pinned to the head SHA, and rebuild the base version by reversing the patch (`reconstructBase()` in `src/core/patch.ts`).
- Only when GitHub omits the patch (very large files) or the patch does not apply is the merge base looked up once (`/compare/{base}...{head}`) and the base file fetched at that commit.
- Reads that fail for a moment (network errors, 408, 5xx, short `Retry-After` cooldowns up to 2 seconds) are retried twice at the same revision. Writes are never retried.
- **GitLab** (`src/platforms/gitlab.ts`): load the raw files at the merge base and the head commit.
- A pull request uses three API requests for up to 100 files, one more per further page, and one comparison request when a patch is omitted. The [user guide](../GUIDE.md#github-githubcom-and-enterprise-server) states these numbers.

## Consequences

- **Good:** public repositories work without a token for ordinary reviews; private ones need only read access.
- **Good:** every read is pinned to a SHA, so a branch moving mid-review cannot mix versions; a patch that no longer applies falls back to the merge base.
- **Costs:** patch reversal is our code to test, including malformed hunks and escapes.
- **Costs:** large reviews are capped (1,000 files on GitHub, 2,000 on GitLab), as the README says.

## Alternatives considered

- **Contents API for both versions:** simpler, but two API requests per file exhaust the unauthenticated limit quickly.
- **Always fetch the merge base:** one extra request per review and per file; needed only when the patch is missing.

## Enforcement

- `src/core/patch.test.ts`, `src/platforms/github*.test.ts` (loading, retries, failures, pagination) at 100% coverage.
- The request allowlist in `src/platforms/github-api.ts` names these calls; anything else is refused by the worker ([ADR 0009](0009-github-tokens-in-the-background-worker.md)).

## References

- `e941109` (0.1.0, patch reversal), `985f4ea` (retries, from pull request [#27](https://github.com/m9rc1n/galley/pull/27)).
- [GitHub REST: list pull request files](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files).
