---
name: platform-adapters
description: Change how Galley reads from and writes to GitHub and GitLab. Use when working in src/platforms (page detection, loading files, pagination, retries, rate limits, tokens, threads, posting comments, Viewed sync, self-hosted sites) or on the ReviewSource contract, or when a review fails to load or a comment fails to post on one platform.
---

# Platform adapters

The reader never talks to a platform directly. Each platform returns a `ReviewSource` (`src/platforms/types.ts`); see [The ReviewSource contract](../../../docs/architecture/README.md#the-reviewsource-contract).

## Map

| File | Does |
| --- | --- |
| `detect.ts` | Recognises pull and merge request pages, including GitLab sub-paths and nested groups, and self-hosted sites |
| `index.ts` | `loadSource(context)`: picks the adapter |
| `github.ts` | Files (100 per page, 10 pages), head from the same-origin raw URL, base by reversing the patch, merge base only when needed, retries for reads ([ADR 0007](../../../docs/adr/0007-rebuild-github-base-from-the-patch.md)) |
| `github-api.ts`, `github-queries.ts` | The request message to the worker and the allowlist of REST paths and GraphQL operations ([ADR 0009](../../../docs/adr/0009-github-tokens-in-the-background-worker.md)) |
| `github-viewed.ts` | Native Viewed state via GraphQL, with a revision check |
| `gitlab.ts` | Merge request API with the session cookie and CSRF token; raw files at the merge base and head; 20 pages |
| `comments.ts` | Comment targets to platform positions, inline or fallback plans, thread loading, context posted as code ([ADR 0008](../../../docs/adr/0008-comment-through-platform-review-apis.md)) |
| `http.ts` | `getText`, `HttpError`; Firefox `content.fetch` so requests go out as the page |
| `tokens.ts`, `token-signal.ts`, `sites.ts` | Token storage (popup and worker only), the token-changed signal, enabled self-hosted sites |

## Rules

- **Pin every read to a revision** (a SHA), so a moving branch cannot mix versions; check the revision is current before any write.
- **Retry reads, never writes.** Reads retry twice for network errors, 408 and 5xx, and short `Retry-After` cooldowns; quota, SSO, permission and not-found errors fail at once with a helpful `ReaderError(message, hint, needsToken)`.
- **Count your requests.** Unauthenticated GitHub allows 60 an hour; the [user guide](../../../docs/GUIDE.md#github-githubcom-and-enterprise-server) states what a review costs. Keep it true.
- **Stay on the platform's origin.** Thread and "View on platform" links go through `platformLink()` in `src/ui/render.ts`; no other host is contacted.
- **Keep both platforms working.** A new `ReviewSource` member is optional; implement it for GitLab or show that it is GitHub-only in the interface.
- **Self-hosted parity:** GitHub Enterprise Server uses `/api/v3` and `/api/graphql` on its own origin; GitLab instances can live under a sub-path. Test both shapes.

## Testing

Use `mockFetch` and `jsonResponse` from `src/testing/http.ts`, fake timers for retries, and the in-memory IndexedDB for tokens. Existing suites to extend: `github.test.ts`, `github-loading.test.ts` (retries and pagination), `github-failures.test.ts`, `gitlab.test.ts`, `gitlab-failures.test.ts`, `comments.test.ts`, `detect.test.ts`, `github-api.test.ts`, `src/background/worker.test.ts`.

To try against real reviews: `npm run dev`, load `dist/dev`, open a public pull request and a GitLab merge request. Never post test comments on someone else's review.
