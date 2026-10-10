---
status: Proposed
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [security, platforms]
---

# ADR 0025: Let the token worker resolve a ref and list the tree of the repository in the tab, and nothing more

## Context

GitHub tokens live in the background worker, which makes only the API calls on an allowlist and only for the pull request open in the tab ([ADR 0009](0009-github-tokens-in-the-background-worker.md)). Reading a repository's docs ([ADR 0024](0024-read-a-repository-at-one-commit.md)) needs two calls the allowlist did not have: resolving a branch or tag to a commit, and listing the commit's tree. Private repositories need the token for both. Document contents are read like review files: from the page's own origin, `/{owner}/{repo}/raw/{commit}/{path}`, with the reader's session and no token ([ADR 0007](0007-rebuild-github-base-from-the-patch.md)). GitLab reads use the browser session from the page's origin and never touch a token.

## Decision

- `allowedRequest` (`src/platforms/github-api.ts`) recognises a **repository page** in the tab (`detectRepository` in `src/platforms/detect.ts`). From such a page the worker allows, for **that repository only**: `GET repos/{owner}/{repo}/commits` with only `sha` and `per_page`, and `GET repos/{owner}/{repo}/git/trees/{sha}` with only `recursive`. No GraphQL, no writes, no other repository, no other query parameter.
- From a **pull request page**, the worker also allows listing **its own repository's tree** (`git/trees/{sha}?recursive=1`) for Project docs. It does not resolve refs there: the review's base and head commits come from the pull request itself.
- Everything else stays refused, as before.

## Consequences

- **Good:** private repositories' docs can be read with the same fine-grained token (Contents: read), and a compromised page still cannot use the worker as a proxy to other repositories or endpoints.
- **Costs:** a reader's token now reaches two more endpoints; both are read-only listings within a repository the reader already has open.
- **Follow-up:** any further repository call (search, blame, history) needs its own entry here and its own test.

## Alternatives considered

- **Read trees without a token:** works for public repositories only, and hits the unauthenticated rate limit quickly.
- **Allow `repos/{owner}/{repo}/*` from repository pages:** simpler, but turns the worker into a general reader of everything the token can see.

## Enforcement

- `src/platforms/github-api.test.ts`: "a repository page may only resolve a ref and list the tree of that repository", "a pull request page may list its own repository’s tree for Project docs, and resolve no refs", and "anything else is refused, including other repositories and pull requests".
- Reviewers treat any change to `allowedRequest` as a security change and look for its test.

## References

- `40a3cd4`, `9755d4c`; [ADR 0009](0009-github-tokens-in-the-background-worker.md); [security model](../architecture/security-model.md).
