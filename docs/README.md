# Galley documentation

Everything about Galley that is not code: how to use it, how it works, why it is built this way, where it is going, and how to change it. Start with the row that matches what you need.

| You want to… | Read |
| --- | --- |
| **Use Galley** | [User guide](GUIDE.md) · [README](../README.md) · [Privacy policy](../PRIVACY.md) |
| **Understand how it works** | [Architecture](architecture/README.md) · [Security model](architecture/security-model.md) · [Storage inventory](architecture/storage.md) · [Glossary](glossary.md) |
| **Know why it is built this way** | [Architecture decision records](adr/README.md) |
| **See where it is going** | [RFCs](rfcs/README.md) · [README roadmap](../README.md#roadmap) |
| **Design or change the interface** | [Design principles](design/README.md) · [Foundations](design/foundations.md) · [UI map](design/ui-map.md) · [Interaction patterns](design/patterns.md) · [Accessibility](design/accessibility.md) · [Voice and copy](COPY.md) |
| **Make a change** | [CONTRIBUTING.md](../CONTRIBUTING.md) · [How-to guides](how-to/README.md) |
| **Ship it** | [Commits and releases](../CONTRIBUTING.md#commits-and-releases) · [PUBLISHING.md](../PUBLISHING.md) · [Firefox](../store/FIREFOX.md) · [Store listing](../store/LISTING.md) · [Artwork](../store/ARTWORK.md) · [Website](../site/README.md) |
| **Work on Galley as a coding agent** | [AGENTS.md](../AGENTS.md), then the skills in `.claude/skills/` |

## How these documents are organised

The folders follow the [Diátaxis](https://diataxis.fr) split, so each document does one job:

| Kind | Purpose | Here |
| --- | --- | --- |
| Tutorials and guides | Learning by doing | [User guide](GUIDE.md), [CONTRIBUTING.md](../CONTRIBUTING.md) set-up |
| How-to guides | A recipe for one task | [`how-to/`](how-to/README.md) |
| Reference | Facts to look up | [Foundations](design/foundations.md), [UI map](design/ui-map.md), [Storage](architecture/storage.md), [Glossary](glossary.md) |
| Explanation | Why things are the way they are | [`architecture/`](architecture/README.md), [`design/`](design/README.md), [`adr/`](adr/README.md), [`rfcs/`](rfcs/README.md) |

Decisions and proposals are connected: every ADR lists the RFCs behind it, and every RFC lists the ADRs it relies on or would change. Their indexes are generated from the files.

## Keeping the docs true

- **Change the docs with the code.** A pull request that changes behaviour updates the user guide; one that changes a boundary updates the architecture pages; one that changes a decision adds an ADR.
- **`npm run docs:check`** (part of `npm run check`, the pre-push hook and CI) fails on broken relative links and heading anchors, stale ADR or RFC indexes, invalid front matter, and one-way links between decisions and proposals.
- **`npm run docs:index`** regenerates the ADR and RFC indexes.
- **Write in Galley's voice** ([COPY.md](COPY.md)): plain words, the reader's real control labels, no claims we cannot back.
- **Review documentation in Galley.** It is what Galley is for.
