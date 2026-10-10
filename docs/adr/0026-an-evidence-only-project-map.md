---
status: Proposed
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [repository, ui]
---

# ADR 0026: Draw the project map only from evidence, say where each part comes from, and keep the reader's corrections beside the source

## Context

A project map is useful only if the reader can trust it. Maps drawn from guesses (similar titles, folder proximity, a model's summary) look authoritative and are often wrong, and the reader cannot tell which lines are real. Repositories also disagree with themselves: a decision record's front matter says Accepted while its Status section says Proposed; a folder named `design/` holds a runbook.

## Decision

- **Documents lens:** a connection between two documents is drawn only from a **Markdown link** in one of them, and every connection lists its links as evidence (text, section, line) that opens the paragraph holding it. Folders are shown as a path, never as a connection. Links the map cannot follow (a missing document, a missing section) are listed, not drawn (`src/core/docindex.ts`).
- **Every entity and connection names its origin** (`Origin` in `src/core/architecture.ts`), in words and with a second cue: **Documented** (a document says it), **Declared in configuration** ([ADR 0027](0027-read-configuration-statically.md)), **Proposed by you**, or **Unverified suggestion**. Suggestions are only "a document of an architecture, overview, spec, decision, guide or runbook kind names this, as a whole word", at most 200 per view, each with its line.
- **Decisions lens:** status, supersession and the RFCs a record names come from its front matter, its Status section and its links, as written. When they disagree, both are shown; Galley never picks one.
- **Types are labelled with their source** (front matter, path, or the reader). The reader can set a document's or a folder's type, or a declared item's type; the source's type stays visible beside theirs ("The source says Service; you set Data store"). Corrections are the reader's and are kept only with their notes ([ADR 0028](0028-private-project-notes.md)).
- The map is a set of **lists**: a document or entity in the middle, its connections in columns. It reads the same with a keyboard or a screen reader, and becomes one column on a phone.

## Consequences

- **Good:** every line on the map can be checked in one click; a reader can tell a proposal or a guess from the project's own documentation.
- **Costs:** relationships a project states only in prose, or in diagrams, are absent until the reader proposes them. Turning diagrams into entities is a separate spike (RFC 0049).
- **Costs:** the map is only as complete as the documents read so far, and says so.

## Alternatives considered

- **Infer relationships from text similarity or a language model:** fills the map, but with connections nobody can verify, and sends repository content to a service ([ADR 0002](0002-no-server-no-telemetry.md)).
- **A force-directed graph of the whole repository:** striking, but unreadable past a few dozen nodes and inaccessible without a list alternative.

## Enforcement

- `src/core/docindex.test.ts`, `src/core/architecture.test.ts` (origins, suggestions capped and whole-word, conflicting statuses kept), `src/ui/repo-map.test.ts` and `src/ui/repo-lenses.test.ts`.
- `e2e/repo.mjs` checks the map's columns, its evidence and its phone layout in Chrome.

## References

- `e0e5cb6`, `7728518`, `b75c60c`; [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) Phases 2 and 3.
