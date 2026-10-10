# Add a GitHub API call

GitHub calls that need the reviewer's token go through the background worker, which makes only the calls in an allowlist ([ADR 0009](../adr/0009-github-tokens-in-the-background-worker.md)). A new call is a security change: keep it as narrow as the feature allows.

## Before you start

- Can the data come from a call Galley already makes, or from the same-origin raw URL (no token, no quota)?
- Does it count against the 60-an-hour unauthenticated limit? The [user guide](../GUIDE.md#github-githubcom-and-enterprise-server) states how many requests a review costs; keep that true or update it.
- Does it read beyond the pull request open in the tab? Then it needs an ADR.

## Steps

1. **Allow it** in `allowedRequest()` (`src/platforms/github-api.ts`). Match the method, the exact path shape, and tie it to the pull request in the tab (`owner`, `repo`, `number` from the page). For GraphQL, add the operation text to `GRAPHQL_OPERATIONS` in `src/platforms/github-queries.ts` and check its variables.
2. **Call it** from the adapter (`src/platforms/github.ts` or a sibling module) through the `GitHubApi` passed in, never with `fetch` directly when a token may be needed. Reads go through `readWithRetry()`; writes never retry.
3. **Explain failures** with `ReaderError(message, hint)`: rate limits, SSO, missing permissions (`needsToken`), not found.
4. **Expose it** to the reader through `ReviewSource` (`src/platforms/types.ts`) if the reader needs it, as an optional member so GitLab and the demo keep working.
5. **Mirror it on GitLab** in `src/platforms/gitlab.ts`, or say in the interface that it is GitHub-only.

## Tests

- `src/platforms/github-api.test.ts`: the call is allowed for the open pull request and refused for another repository, another pull request, another method, another host and a malformed URL.
- `src/background/worker.test.ts` if the worker's handling changes (headers forwarded, sender checks).
- Adapter tests with `mockFetch` (`src/testing/http.ts`): success, retries for reads, no retries for writes, each `ReaderError`.

## Also update

- [PRIVACY.md](../../PRIVACY.md) if Galley now reads or sends something new.
- The [user guide](../GUIDE.md#github-githubcom-and-enterprise-server) request count and token permissions.
- The [security model](../architecture/security-model.md) if a boundary changed.

## Done when

`npm run check` passes and you have tried it against a real public pull request with `npm run dev`, with and without a token.
