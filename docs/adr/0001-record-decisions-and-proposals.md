---
status: Accepted
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [process, docs]
---

# ADR 0001: Record decisions as ADRs and proposals as RFCs, linked both ways

## Context

By October 2026 Galley's reasoning lived in three places: long commit messages, pull request descriptions, and fourteen RFCs filed as GitHub issues (#36 to #49). None of it was in the repository. A contributor, or a coding agent in a fresh checkout with no GitHub access, could read what the code does but not why, and could not tell an accepted direction from an open question.

Galley is itself a tool for reading documents like these in review, and [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) proposes reading a project's specs and ADRs as a connected map. Its open questions include what metadata could make document types and relations portable.

## Decision

- **Decisions** are architecture decision records in `docs/adr/NNNN-short-title.md`, numbered in order. Each has YAML front matter (`status`, `date`, `deciders`, `rfcs`, and `supersedes` / `superseded-by` when one replaces another) and the sections in [the template](template.md), including **Enforcement**: what fails if the decision is broken.
- **Proposals** are RFCs in `docs/rfcs/NNNN-short-title.md`. The number is the GitHub issue that hosts the discussion, so RFC 0037 is discussed in issue #37. The file is the proposal; edits go through pull requests.
- **Links go both ways.** An ADR's `rfcs:` and an RFC's `adrs:` must agree, and so must `supersedes:` and `superseded-by:`.
- **Indexes are generated.** `npm run docs:index` writes the tables in [the ADR index](README.md) and [the RFC index](../rfcs/README.md) from the files.
- **The check is part of `npm run check`.** `scripts/docs.mjs` verifies front matter, statuses, the two-way links, that the indexes are current, and that every relative link and heading anchor in the repository's Markdown resolves.
- Decisions already made are backfilled as ADRs 0002 to 0023, from the history, with their original dates. The RFC issues are imported as files, their text unchanged apart from links.

The front matter is plain YAML that GitHub and Galley both show as metadata. That makes this repository a realistic test corpus for RFC 0049. It is not a decision about RFC 0049's metadata format.

## Consequences

- **Good:** the reasoning travels with the code, is reviewed like code, and can be read offline by people and agents. Broken links and one-way references fail before they merge.
- **Good:** a pull request that contradicts an ADR is easy to spot, and the fix is explicit: a superseding ADR.
- **Costs:** an RFC has two homes, the issue (discussion) and the file (text). Until each issue links its file, readers of the issue may see older text.
- **Costs:** contributors run `npm run docs:index` after adding a record; the check tells them when they forget.

## Alternatives considered

- **Keep RFCs as issues only:** discussion stays in one place, but the text is invisible to a checkout, cannot be reviewed line by line, and cannot link to decisions.
- **A separate numbering for RFCs:** cleaner file names, but two numbers for one proposal. Using the issue number keeps "RFC 0037" and "#37" the same thing.
- **A documentation site generator:** better navigation, but a new dependency and build step for a problem plain Markdown, GitHub and Galley already solve.
- **No generated indexes:** fewer moving parts, but hand-kept tables drift.

## Enforcement

- `npm run docs:check` (in `npm run check`, the pre-push hook, and the **Documentation** step of CI) fails on missing front matter, unknown statuses, one-way links, stale indexes and broken relative links or anchors.
- `scripts/docs.test.mjs` covers the checker itself.
- [AGENTS.md](../../AGENTS.md) and the `decision-records` agent skill tell agents to read the ADRs for an area before changing it, and to propose a superseding ADR instead of working around one.

## References

- RFC issues [#36](https://github.com/m9rc1n/galley/issues/36) to [#49](https://github.com/m9rc1n/galley/issues/49).
- Michael Nygard, [Documenting architecture decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), and [MADR](https://adr.github.io/madr/), which the template follows loosely.
