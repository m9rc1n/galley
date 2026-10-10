---
status: Accepted
date: 2026-10-09
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [process, ci, website]
---

# ADR 0023: Publish temporary pull request demos on GitHub Pages from a default-branch publisher

## Context

Reviewing a change to the reader means trying it, and the demo runs the real reader on a sample review in any browser. Before this, a pull request's demo existed only on the author's machine. The website and demo are already published on GitHub Pages, which replaces the whole site on every deployment, and workflows triggered by pull requests from forks must not get write permissions.

## Decision

- The **Website** workflow (`pages.yml`) builds the site and demo for every pull request with **read-only** permissions and uploads them as an artifact.
- A separate **publisher** (`publish-pages.yml`) runs from `main` on `workflow_run`. It checks that the build succeeded for a same-repository pull request that is still open at the built revision, treats the artifact as static data (no links, no repository metadata), and publishes it at `/galley/pr-preview/<number>/demo/`.
- Open previews are kept on the generated `pages-previews` branch and combined with the production site on every deployment. Publications are **queued**, so concurrent updates and clean-ups all survive. Closing or merging removes the preview.
- One bot comment per pull request tracks the preview address and revision, then records removal.
- Pull requests from forks are checked but not published.

## Consequences

- **Good:** reviewers try reader changes in a browser before merging, with no new secrets or Pages settings.
- **Costs:** the publisher only runs from the default branch, so changes to it take effect after they merge.
- **Costs:** more workflow logic to test (`scripts/pages-*.mjs`).

## Alternatives considered

- **A third-party preview service:** a new account and token, and pull request content leaving GitHub.
- **Publishing from the pull request workflow:** would need write permissions in a context forks can trigger.

## Enforcement

- `npm run test:pages` (in `npm run check` and CI): preview lifecycle, file isolation and publisher tests.
- `npm run test:site` checks the built site and the demo at a nested path.

## References

- `3156d0f`, pull request [#51](https://github.com/m9rc1n/galley/pull/51); [site/README.md](../../site/README.md#publish-on-github-pages).
