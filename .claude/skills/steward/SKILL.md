---
name: steward
description: Take a Galley change from a working tree to a mergeable pull request. Use before committing or pushing, when choosing a pull request title or writing its description, when the pre-push hook or a CI job fails, when review comments arrive, and when handling release-please or Dependabot pull requests.
---

# Stewarding a change in Galley

## Before you commit

Run what CI runs. `npm run check` is the minimum for every push (the pre-push hook runs it on each pushed commit in a clean worktree):

| CI job (`.github/workflows/ci.yml`) | Run locally | Usual fix |
| --- | --- | --- |
| Lint, formatting and types | `npm run typecheck`, `npx biome ci .` | `npm run format`, `npm run lint:fix`; fix types properly, no `any` |
| Documentation (same job) | `npm run test:docs && npm run docs:check` | `npm run docs:index` for stale indexes; fix the link or anchor it names |
| Tests (Node 22 and 24) | `npm run test:coverage`, `npm run test:pages` | `galley-tests` skill; 100% per file |
| Build | `npm run build` | Token code reached a page bundle, or a dev-only mark leaked |
| Browser checks | `npm run test:e2e` | `verify-ui` skill |
| Dependency audit | `npm audit --audit-level=low` | Update the dependency; never ignore an advisory silently |
| PR title (`pr-title.yml`) | — | Conventional Commit title, see below |
| Website (`pages.yml`), for site or demo changes | `npm run build:site && npm run test:site` | — |

Also: look at UI changes (`npm run screenshots`), update the docs that describe changed behaviour, and re-read your diff for anything outside the task.

## Commits and pull request titles

Pull requests are squash-merged, so **the title is the commit**: `type(scope): summary`, lower-case type, imperative summary that says what a user gets ([ADR 0014](../../../docs/adr/0014-release-from-conventional-commits.md)).

| A user of the extension would… | Type | Release |
| --- | --- | --- |
| get a new capability | `feat` | minor |
| see a correction | `fix` (or `perf`, `revert`) | patch |
| notice nothing (docs, tests, CI, refactor, tooling) | `docs`, `test`, `ci`, `refactor`, `build`, `chore`, `style` | none |

Scopes in use: `reader` and `github`, and `deps` on Dependabot titles; name the area (`gitlab`, `popup`, `site`) when no existing scope fits. A new browser permission is at least `feat`. Never edit `version` in `package.json`, `.release-please-manifest.json` or `CHANGELOG.md`.

## The pull request description

Follow the shape of the existing ones: what the reviewer gets and why (a short paragraph), what changed (grouped bullets with the real control labels), anything reviewers must know (reversed decisions, follow-ups, activation steps), and **Checks** listing what you ran with counts (`npm run check`: N tests, 100% coverage; `npm run test:e2e`; screenshots inspected). Link RFCs with `Refs #NN` and ADRs by path. Include before and after screenshots for visual changes.

## When something fails

- Reproduce locally first; read the failing assertion's message (browser checks print measured values).
- Fix the cause in the smallest change. Never skip, weaken or delete a test to get green, never add coverage-ignore comments, never push an empty commit to re-run CI.
- A failure that also happens on `main` is not this change's: say so on the pull request, with the evidence.
- Formatting-only failures: `npm run format`, commit as part of the change.

## Review comments

Small, clear requests (renames, a test, copy fixes): do them and push. Larger or design-level requests: reply with a proposal and let the maintainer decide. If a request would contradict an ADR, point to it and suggest a superseding ADR instead.

## Bot pull requests

- **release-please** (`chore(main): release X.Y.Z`): generated; do not push to it. The maintainer merges it to release.
- **Dependabot:** titles are already `build(deps)` or `ci(deps)`. Check the changelog of the dependency, run `npm run check` and `npm run test:e2e`; a new runtime dependency licence must stay permissive.
