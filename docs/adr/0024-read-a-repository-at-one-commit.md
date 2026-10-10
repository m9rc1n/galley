---
status: Proposed
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [repository, platforms]
---

# ADR 0024: Read a repository at one resolved commit, as a snapshot that refreshes only when asked

## Context

[RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) extends Galley from reading a change to reading a project: its README, specs, decision records and runbooks, and the links between them. A repository page names a branch, a tag or a commit, and a branch moves while someone reads. A reader that fetched each document at "the branch" could show one document from before a push and the next from after it, and a map built from both would describe a repository that never existed. Branch names may contain slashes (`feature/render`), so where the ref ends in `/tree/feature/render/docs` is not known from the address alone. Repositories can hold tens of thousands of files.

## Decision

- A repository is read through a `RepositorySource` (`src/platforms/types.ts`), separate from `ReviewSource`: it has no diffs, comments or Viewed state. Its `commit` is resolved once when the reader opens, and **every listing and document read uses that commit**. The commit is shown in the top bar and in each document's byline.
- The ref is found by trying candidates **shortest first**, at most four (`refCandidates` in `src/platforms/detect.ts`): GitHub `GET /repos/{owner}/{repo}/commits?sha=…&per_page=1`, GitLab `GET /projects/:id/repository/commits/:ref`. A commit page, and a review's base or head, are **pinned**: there is nothing newer to check.
- **Refresh is explicit.** The reader checks the branch or tag again only when asked; a new commit is a new snapshot: the listing, map, configuration and anchor states start over, and the reader is told both commits. Private notes are about the repository, not the commit, and stay ([ADR 0028](0028-private-project-notes.md)).
- Listing is **bounded** (`src/core/discovery.ts`): at most 2,000 Markdown documents and 60 configuration files, documentation folders first; a truncated GitHub tree is listed again by documentation and configuration folder. What was left out is said in the documents list and the map.
- The map reads documents in **passes of 150, four at a time** (`readForIndex` in `src/core/docindex.ts`), the first pass by itself and later ones on request; the reader can stop a pass. A document over 2,000,000 characters is listed as too large, not read.
- From a pull or merge request, `ReviewSource.project` opens the same repository **pinned at the review's base or head** (Project docs, [RFC 0049 Phase 5](../rfcs/0049-repository-docs-and-project-maps.md#phase-5--connect-project-understanding-to-reviews)).

## Consequences

- **Good:** what the reader sees, the map and every piece of evidence describe one commit, and links to the platform point at that commit.
- **Good:** large repositories open quickly and stay responsive; partial reading is stated, never hidden.
- **Costs:** a reader who wants the newest docs presses refresh; the map then reads again from nothing.
- **Costs:** documents beyond the budgets are missing from the outline and the map until a narrower page (a folder) is opened.

## Alternatives considered

- **Read files at the branch name:** fewer requests, but documents and the map can disagree mid-session.
- **Refresh on a timer or on focus:** keeps up with pushes, but moves the ground under the reader without a choice.
- **List everything:** complete, but a monorepo would take minutes and thousands of requests before anything shows.

## Enforcement

- `src/platforms/github-repo.test.ts` and `src/platforms/gitlab-repo.test.ts`: one commit for every read, shortest-first refs, re-listing a truncated tree, pinned commit pages.
- `src/core/discovery.test.ts` (budgets and their messages), `src/core/docindex.test.ts` (passes), `src/ui/repo-map.test.ts` ("checking for a newer commit keeps the snapshot when nothing moved, and starts over when it did").
- `e2e/repo.mjs` checks the commit shown in the byline and top bar in Chrome.

## References

- `40a3cd4`, `e0e5cb6`, `7728518`, `9755d4c`, `b75c60c`; [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md), issue [#49](https://github.com/m9rc1n/galley/issues/49).
- GitHub [trees](https://docs.github.com/en/rest/git/trees#get-a-tree) and [commits](https://docs.github.com/en/rest/commits/commits#list-commits); GitLab [repository trees](https://docs.gitlab.com/api/repositories/#list-all-repository-trees-in-a-project) and [commits](https://docs.gitlab.com/api/commits/#get-a-single-commit).
