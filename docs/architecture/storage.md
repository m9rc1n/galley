# Storage inventory

Everything Galley keeps, where, and for how long. [PRIVACY.md](../../PRIVACY.md) tells reviewers the same thing in plain words; keep the two in step. Adding a key, extending what one holds or changing how long it lives is a privacy change: update both, and consider an ADR ([ADR 0019](../adr/0019-review-progress-as-fingerprints.md)).

## In the extension

| What | Where | Key | Contents | Lifetime | Code |
| --- | --- | --- | --- | --- | --- |
| Reader and opening settings | `chrome.storage.local` | `galley:settings` | The `Settings` object: page-button choice, palette, appearance, typeface, size, layout, density, review options | Until changed or uninstalled | `src/ui/settings.ts` |
| Viewed progress (no token, or GitLab) | `chrome.storage.local` | `galley:viewed:<sha256>` | `true`; the key is a SHA-256 of the review address, file paths, status and both versions' contents | Until unmarked or uninstalled; a changed file gets a new key | `src/ui/viewed.ts` |
| Reading positions | `chrome.storage.local` | `galley:positions` | Per review fingerprint: a fingerprint of the file path, a scroll offset, a time | The 50 most recent reviews | `src/ui/positions.ts` |
| Repository notes | `chrome.storage.local` | `galley:project:<sha256>`; the key is a SHA-256 of the repository's address | The reader's saved notes, proposed components and connections, and the types they set, plus a draft of unsaved changes. Each anchored note keeps its document's path, title and heading as a label, the commit and a SHA-256 of the section | Until deleted with **Delete all notes…** or uninstalled; written only on Save, and as a draft for recovery | `src/ui/project-store.ts` ([ADR 0028](../adr/0028-private-project-notes.md)) |
| GitHub tokens | Extension IndexedDB | one record per site origin | The token, for https origins only | Until removed in the popup or uninstalled | `src/platforms/tokens.ts` |
| Token-change signal | `chrome.storage.local` | `galley:tokens-changed` | The site and a time; no secret | Overwritten on each change | `src/platforms/token-signal.ts` |
| Enabled self-hosted sites | Browser permissions and registered content scripts | the granted host permission | The site's origin | Until disabled | `src/platforms/sites.ts` |
| Legacy tokens | `chrome.storage.local` | `galley:tokens` | Tokens saved by versions up to 0.2 | Migrated to IndexedDB and deleted on start | `src/platforms/tokens.ts` |

## In memory only

Review contents, rendered documents, threads, comment drafts, chapter edits and the platform source cache live in the page's memory while the reader or page is open, and are gone when it closes. So do a repository's listing, documents, configuration, project map and reading history in the repository reader.

Consented image fallbacks keep only their image address and dimensions in a sandboxed frame until that document is removed. They add no storage key or host permission.

## In the demo

The demo uses `localStorage` for settings, Viewed, positions and repository notes, and `sessionStorage` for its simulated comments. Nothing is sent anywhere.

## What is never stored

Repository content, file paths and review addresses in readable form (except the paths and headings a saved note is about, which the reader chose to keep), comment text after posting, analytics of any kind.
