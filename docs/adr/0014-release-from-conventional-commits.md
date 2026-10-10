---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [process, release]
---

# ADR 0014: Version and release from Conventional Commits with release-please

## Context

Every Chrome Web Store upload goes through review, and the store needs a version higher than the last. Editing versions by hand in `package.json`, the manifest and the changelog was error-prone, and changes nobody using the extension would notice (docs, tests, CI) should not trigger an upload.

## Decision

- Pull requests are **squash-merged**, so the pull request title is the commit message, in [Conventional Commits](https://www.conventionalcommits.org) form: `type(scope): summary`. A check on every pull request enforces it (`.github/workflows/pr-title.yml`).
- The type is chosen by what an extension user would notice: `feat` for new capability (minor), `fix`, `perf` and `revert` for corrections (patch); `docs`, `refactor`, `test`, `build`, `ci`, `chore` and `style` are hidden and never open a release. A new browser permission is at least a `feat`, because Chrome disables the extension until the user accepts it.
- [release-please](https://github.com/googleapis/release-please) keeps one release pull request open, raising the version in `package.json` and `package-lock.json` and writing [CHANGELOG.md](../../CHANGELOG.md). The build copies the version into the manifest. **Merging the release pull request is the release**: it tags `vX.Y.Z`, and `release.yml` builds Chrome, Firefox and source zips with checksums and build provenance.
- Nobody edits the version or the changelog by hand. `Release-As:` in a commit footer forces a version.

## Consequences

- **Good:** versions and changelogs are mechanical; the maintainer chooses when to ship by merging one pull request.
- **Costs:** contributors must pick the right type; a wrong `feat` can open an unwanted release (the release pull request can wait while changes batch up).

## Alternatives considered

- **Manual versioning:** the earlier process; easy to forget a file.
- **semantic-release:** publishes on every merge; release-please lets releases batch behind a reviewable pull request.

## Enforcement

- `.github/workflows/pr-title.yml` rejects non-conforming titles; Dependabot titles are configured to conform.
- `release-please-config.json` and `.release-please-manifest.json`.
- The `steward` agent skill tells agents how to title pull requests and never to edit versions or the changelog.

## References

- `b542639`, [CONTRIBUTING.md, Commits and releases](../../CONTRIBUTING.md#commits-and-releases), [PUBLISHING.md](../../PUBLISHING.md).
