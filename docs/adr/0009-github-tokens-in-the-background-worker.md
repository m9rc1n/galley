---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [security, github]
---

# ADR 0009: Keep GitHub tokens in the background worker, behind an allowlist of the reader's own API calls

## Context

GitHub's API does not accept the browser session, so private repositories and commenting need a personal access token. Versions up to 0.2 kept tokens in `chrome.storage.local`, which content scripts can read, and content scripts run inside github.com's renderer. A compromised or hostile page could then read the token, or use the content script as a proxy to call any API with it.

## Decision

- Tokens live in the **extension's own IndexedDB** (`src/platforms/tokens.ts`), which only extension pages (the popup) and the background worker can open. One token per site: github.com or a GitHub Enterprise Server origin, https only.
- **Only the background worker** (`src/background/worker.ts`) attaches the token. Content scripts send a message naming the request; the worker takes the site from the browser's sender information, never from the message.
- The worker makes **only the calls in the allowlist** (`allowedRequest()` in `src/platforms/github-api.ts`): the pull request open in that tab, its files, comparisons, review comments and the GraphQL operations listed in `src/platforms/github-queries.ts`. Everything else is refused.
- Content scripts learn only whether a token exists. Saving or removing a token writes a non-secret signal (site and time) so open reviews pick it up without a reload.
- Enterprise sites are checked to answer like GitHub Enterprise Server before a token is saved for them. Tokens from older versions are migrated out of `chrome.storage.local` and deleted there.

## Consequences

- **Good:** a page cannot read the token, and cannot use Galley to call arbitrary APIs with it.
- **Costs:** every new GitHub call must be added to the allowlist, with a test; features that read beyond the open pull request (repository reading in [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md)) need a narrow extension of it.
- **Costs:** an extra message hop per request.

## Alternatives considered

- **Token in `chrome.storage.local`:** the earlier design; readable from the page's renderer.
- **OAuth app with a Galley backend:** better token hygiene, but a server ([ADR 0002](0002-no-server-no-telemetry.md)).

## Enforcement

- `npm run build` fails if `src/platforms/tokens` or `src/background/` is bundled into `content.js` or a sandbox frame (`checkTokenIsolation()` in `scripts/build.mjs`).
- `src/background/worker.test.ts` and `src/platforms/github-api.test.ts` test sender checks, token scoping, header filtering and refused requests; mutating the checks makes them fail.
- [How to add a GitHub API call](../how-to/add-a-github-api-call.md).

## References

- `a20bac7` (0.3.1, tokens moved and the worker allowlist), `6316046` (token-change signal).
- [User guide, GitHub](../GUIDE.md#github-githubcom-and-enterprise-server), [PRIVACY.md](../../PRIVACY.md).
