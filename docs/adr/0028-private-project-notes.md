---
status: Accepted
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [privacy, storage, repository]
---

# ADR 0028: Keep the reader's project notes on the device only when they save, recover drafts, and share only through an export they preview

## Context

[RFC 0049 Phase 4](../rfcs/0049-repository-docs-and-project-maps.md#phase-4--private-brainstorming-anchored-to-the-project) asks for a private space for ideas, questions, assumptions, next experiments and alternatives, anchored to sections of a repository's documents, plus the components and connections a reader proposes on the map. Unlike review progress ([ADR 0019](0019-review-progress-as-fingerprints.md)), these are authored text that the reader wants back, so they cannot be reduced to fingerprints. Galley has no server ([ADR 0002](0002-no-server-no-telemetry.md)). The RFC's blocking question for persistence was what may be kept, and how it is cleared and shared.

## Decision

- Notes, proposed entities and connections, and the types a reader sets are one `Thinking` value per repository (`src/core/notes.ts`), stored in `chrome.storage.local` (the demo uses `localStorage`) under **`galley:project:<sha256 of the repository id>`** (`src/ui/project-store.ts`). The key names no repository. The value holds what the reader wrote and, for each anchored note, the document's path, its title and heading as a label, the commit and a SHA-256 of the section; no other document content.
- **Saving is explicit.** Changes are kept as a **draft** in the same entry a second after each change and when the reader closes; a draft from an earlier visit is **offered for recovery**, never applied by itself. Writes are queued, so a draft never overwrites a save. Storage that refuses a write is said, and the notes stay open and unsaved. At most 500 notes per repository and 1,000,000 stored characters; past that, saving says so.
- **Anchors** keep the document path, heading, commit and section fingerprint. At another commit a note is "unchanged", "changed: reconfirm" or "gone: detach"; Galley never moves a note to another section by itself.
- **Deleting all notes** asks first and removes the entry. Single notes are deleted from the open notes and from storage on the next save.
- **Export** includes only notes the reader ticks, as Markdown or Mermaid, shown in full before Copy or Download. Every note is labelled a proposal, and every source link points at the commit read. **Opening a new issue** is a separate, deliberate action: it opens the platform's own new-issue form in a new tab with the text filled in (`RepositorySource.newIssue`), and nothing is posted unless the reader submits it there. Galley never writes to the repository.
- Stored data is checked item by item when read (`parseThinking`); anything malformed is dropped, not trusted.

## Consequences

- **Good:** a reader can pause and come back to their reasoning, and nothing leaves the device unless they export it.
- **Costs:** notes are per browser profile; they do not sync between devices, and clearing extension storage or uninstalling deletes them.
- **Costs:** the stored value is readable to anyone with access to the browser profile, like any extension storage. [PRIVACY.md](../../PRIVACY.md) says so.
- **Follow-up:** syncing, sharing with a team or attaching notes to a review are separate decisions.

## Alternatives considered

- **Save automatically:** fewer clicks, but keeps thoughts the reader may have meant as scratch, which the RFC rules out.
- **Store notes in the repository (a file or an issue):** shareable, but makes private thinking public by default and needs write access.
- **Session-only notes:** nothing stored, but the RFC's exit gate (pause, reopen, recover) cannot be met.

## Enforcement

- `src/ui/project-store.test.ts` (fingerprinted key, drafts and saves in order, failures said, size limit), `src/core/notes.test.ts` (validation, anchors, exports), `src/ui/repo-notes.test.ts` (save, recover, discard, delete all, export preview, issue link).
- [PRIVACY.md](../../PRIVACY.md) and the [storage inventory](../architecture/storage.md) must list the key; reviewers treat a new key or field as a privacy change.

## References

- `b75c60c`; [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) Phase 4; [ADR 0019](0019-review-progress-as-fingerprints.md).
