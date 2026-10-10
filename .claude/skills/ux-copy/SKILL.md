---
name: ux-copy
description: Write and review Galley's product words in its voice. Use for any text a user reads, including UI labels, buttons, settings explanations, toasts, error messages, empty states, the user guide, README, website, store listing, privacy text, release notes and feat or fix pull request titles.
---

# Galley's voice

The source of truth is [docs/COPY.md](../../../docs/COPY.md). Read it before writing. The essentials:

- **Tagline:** "Understand changes. Review in peace."
- **Voice:** a helpful teammate. Clear, friendly, specific. Short sentences, familiar words. Lead with what the reviewer can understand or do, then the feature that helps.
- **Humour:** small and about the product ("Your scrollbar gets a breather"). Never about tired reviewers, careless approvals, hidden mistakes or privacy.
- **Shared terms:** Review, Documents, Code files, Edits in context, Comments and replies, Changed parts / Whole files, Marked / Clean, Viewed. Use the reader's actual control labels, with their arrows: **Settings → Review → Context**.

## Claims

Only claim what is true and shown:

- Help understanding changes; never measured speed, fewer bugs, better approvals or adoption.
- "No Galley account needed." Private GitHub repositories need a token; self-hosted sites need permission.
- Code files are optional and not every file type is supported.
- Comments go to the existing review; teammates need nothing new. Approving and resolving stay on the platform.
- Files render in the browser; no server or analytics. External images contact their host only when loaded.

## In the interface

- **Buttons say what happens:** **Show changes**, **Save token**, **Back to the diff**, **Start here**. Sentence case, no full stop.
- **Settings:** the name of what is chosen, then a `small` line with the benefit ("Compact fits more on the screen"). Choices are nouns.
- **Errors:** what happened, then the next useful action. Keep drafts and permission details explicit. ("GitHub API rate limit reached." / "Wait a few minutes and try again.")
- **Toasts:** a few words confirming what the reviewer just did ("Comment posted").
- **Counts and ranges:** "1,204 added", "lines 31–37" (en dash), "20 px".
- **Accessible names** read naturally aloud and include context: "Show changes in docs/guide.md", "Close reader (Esc)".
- British and American spellings both appear in the codebase; match the file you are editing, and keep user-facing text consistent within a surface.

## Reviewing copy

Check each line: Is it true? Is it the shortest clear version? Does it use the real label? Would a reviewer know what to do next? Flag anything that implies Galley judges code, guarantees outcomes or sends data anywhere.

## Where copy lives

UI strings in `src/ui/reader.ts`, `src/ui/chapters.ts`, `src/ui/launcher.ts`, `src/popup/popup.html` and `popup.ts`; errors in `src/platforms/*.ts` (`ReaderError`); docs in `README.md` and `docs/GUIDE.md`; store text in `store/LISTING.md` and `store/FIREFOX.md`; screenshot captions in `scripts/artwork.mjs`; the website in `site/index.html`. Changing a label means updating every place that quotes it (search for it).
