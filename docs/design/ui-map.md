# UI map

Every surface a reviewer meets, with the name they see, where it lives in the code, its states, and what tests it. Use the user-facing name in copy and pull requests; use the class or `data-act` when you work on it.

Conventions in the code:

- Everything in the reader lives in one shadow root under `#galley-reader` (`#galley-reader-dev` in the development build). Selectors in tests and browser checks start from `document.querySelector('#galley-reader').shadowRoot`.
- Classes start with `mr-` (from the project's first name). State classes start with `is-` (`is-folded`, `is-current`, `is-dark`) or `mode-` (`mode-changes`, `mode-clean`).
- Clicks are handled once, in `Reader.onClick()`, by the button's `data-act` attribute. Settings groups use `data-setting` with `data-value` children.
- Settings set attributes on `.mr-root`: `data-theme`, `data-font`, `data-layout`, `data-density`, plus the classes `is-dark`, `mode-changes` or `mode-clean`, `no-signs` and `no-top-glow`.

## The composition on a wide screen

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ▔▔▔▔▔▔▔▔▔ progress bar                                                                     │
│ [×] galley        ● reader-guide.md  2 of 5 ▾        [▲ Change 3 of 12 ▼] Chapters [✓] [⚙] │ top bar
├──────────────┬──────────────────────────────────────────┬──────────────────────────────────┤
│ CONTENTS     │ File 2 of 5                              │                                  │
│ • Goals      │ Reading-first reviews                    │  ┌────────────────────────────┐  │
│ • How it…    │ Standfirst                               │  │ Dana · 2 h                 │  │ comments
│   Non-goals  │ ───────────────────────────────────────  │  │ Does this cover batch      │  │ column
│              │ 4 min read · ● 3 edited · ● 1 added      │  │ uploads?           Reply   │  │ (cards level
│ contents     │                         [✓ Viewed][⌃ Fold]│  └────────────────────────────┘  │ with their
│ rail         │ ───────────────────────────────────────  │                                  │ text)
│              ┃ Text with ~~old~~ new words marked…      │  Add a comment…                  │
│              │ ⋯ 4 unchanged blocks                     │                                  │
├──────────────┴──────────────────────────────────────────┴──────────────────────────────────┤
│ margin bars (┃) sit just left of the text                         toast · resume offer      │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

Below 1,280 pixels the contents rail disappears and cards sit under the paragraphs they discuss. Below 760 pixels the wordmark gives way to the file name and the settings rise as a bottom sheet. See [Foundations, Layout](foundations.md#layout).

## On the platform page

| Surface | What the reviewer sees | Code | States and notes | Tested in |
| --- | --- | --- | --- | --- |
| Launcher | **Read** button with a count, bottom right of a pull or merge request | `src/ui/launcher.ts`, `#galley-launcher` | Count of documents, or of code files when there are no documents; **!** in red when loading failed (click retries); **×** hides it for this page; orange **DEV** tag in the development build | `launcher.test.ts`, `launcher.dev.test.ts` |
| Toolbar popup | Galley's icon in the browser toolbar | `src/popup/popup.html`, `popup.ts`, `popup.css` | **Read this review** or **Read the project** first, with the page's name and no file-list request; **Enable on <site>** for self-hosted GitLab or GitHub Enterprise; **GitHub token** form on GitHub sites (**Save token**, status line); **Settings…** beside the wordmark, key hints in the footer | `popup.test.ts`, `popup.dev.test.ts`, `e2e/opening.mjs` |
| Extension settings | **Galley settings**, **Opening the reader**, **Read button on the page** | `src/options/`, `options_ui` in the manifest | Page buttons start on; off means no eager file-list request, while the toolbar and shortcut remain available; read/write failures explain what was not saved | `options.test.ts`, `settings.test.ts`, `e2e/opening.mjs` |
| Extension shortcut | **Read this page in Galley** | `src/manifest.json`, `src/background/worker.ts`, `src/content/main.ts` | Suggested <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>R</kbd>, configurable in the browser; opens the current review or repository reader, or focuses an already open reader without replacing drafts | `worker.test.ts`, `main.test.ts` |

## The reader

### Frame

| Surface | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Progress bar | A 2-pixel line across the top | `.mr-progress` | Scales with scroll position |
| Top bar | One row: close, wordmark, current file, change navigation, chapters, Viewed, settings | `.mr-topbar` (`.mr-tb-left`, `.mr-tb-center`, `.mr-tb-right`) | Sticky; translucent with backdrop blur; optional **top glow** (`no-top-glow` turns it off) |
| Close | **×** "Close reader (Esc)" | `[data-act="close"]` | Kept open while a comment is unsent |
| Current file | Status dot, file name, "2 of 5", chevron | `.mr-file-btn` → `updateFileButton()` | `aria-haspopup="menu"`, `aria-expanded`; accessible name "Browse files: edited docs/guide.md, 2 of 5"; key <kbd>F</kbd> |
| Change navigation | **▲ Change 3 of 12 ▼** | `.mr-pill` (`[data-act="prev"]`, `[data-act="next"]`) | Label is live (`aria-live="polite"`); keys <kbd>J</kbd> <kbd>K</kbd> |
| Chapters | **Chapters** | `.mr-chapters-toggle` | Opens the chapter map; key <kbd>M</kbd> |
| Project library | Book icon and **Library**, accessible name **Project library** (icon only up to 380 pixels, where the same choices close the document menu) | `.mr-project-btn`, `[data-act="project"]` → `.mr-menu.mr-project` | Shown when the review has a `project`; **As this change leaves them** (head) or **Before this change** (base), `[data-act="project-open"]`; opens the repository reader over the review |
| Viewed | Check icon | `.mr-viewed`, `[data-act="viewed"]` | `aria-pressed`; disabled while saving; tooltip says where progress is saved; key <kbd>V</kbd>; result in `.mr-viewed-feedback` (`role="status"`) |
| Settings | Sliders icon "Reading settings" | `[data-act="settings"]` | `aria-haspopup="dialog"`; keys <kbd>,</kbd> and <kbd>?</kbd> (opens Keys) |
| Contents rail | **Contents**: headings of the current document, change dots in the margin | `.mr-toc` (`buildToc()`) | Wide screens only; steps aside (`is-covered`) while a wide code block passes; in the **Files** layout, `.mr-file-list` lists every file with status, folded and viewed marks |
| Margin bars | Thin coloured bars beside changed blocks | `.mr-gutter` with `.mr-mark` (`is-point` for a single line) | Half strength at rest; full beside the block under the pointer; hidden in Clean mode except quiet bars |

### Menus and sheets

| Surface | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Document menu | Every changed file with folder and status, under the request title; "1 of 3 viewed" | `.mr-menu.mr-files`, `role="menu"` | Tags and counts folded files (`.mr-files-folded`); closes on outside click and <kbd>Esc</kbd> |
| Chapter map | **Start here** or **Continue here**, chapters with their reason and files, **All files**, **Edit chapters**, **New chapter**, **Reset chapters** | `src/ui/chapters.ts` (`ChapterMap`, `.mr-chapters`), grouping in `src/core/chapters.ts` | Route bar (`.mr-chapter-route`) and **Next chapter** for six or more files; **Other changed files** link to the platform diff; edits last for the session ([ADR 0022](../adr/0022-review-chapters-from-evidence.md)) |
| Settings sheet | **Reading settings**, four tabs: **Reading**, **Layout**, **Review**, **Keys** | `.mr-settings` → `.mr-settings-panel` (`role="dialog"`, `aria-modal`) | Changes apply at once and persist (`updateSettings()` merges only the changed choice); the page behind is `inert`; arrow keys move between tabs; bottom sheet on phones. Contents in the [user guide](../GUIDE.md#settings) |
| Enlarged diagram | The diagram over the whole window with a zoom bar | `.mr-lightbox` | Fit on open; pinch, ⌘/Ctrl + scroll, double-click, <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd>, arrow keys and drag; closes on backdrop, **×** or <kbd>Esc</kbd> |

### A file in the stream

Every changed file is a `section.mr-document` with `aria-label` set to its path and `data-document` set to its index. Classes: `doc-added`, `doc-removed`, `is-code`, `is-folded`.

| Part | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| File slug | "File 3 of 8" under a hairline that ends the previous file | `.mr-document::before`, CSS counters `galley-file` and `galley-files` | Spacing shrinks in Compact |
| Title and standfirst | The document's first heading and paragraph; a source file's path | `.mr-title`, `.mr-lead`, `.mr-subtitle`; `.mr-code-title` for code | Source-file titles are smaller so paths fit |
| Byline | "4 min read" or the language; status chips; extra notes; **Viewed** and **Fold** at the end | `byline()` → `.mr-byline`, `.mr-file-meta`, `.mr-file-actions`, `.mr-file-viewed`, `.mr-fold-file` | Chips: "New document", "Deleted document · You are reading its last version", "3 edited", "1 added", "2 removed", "Moved, text unchanged"; **N lines not shown** links to the platform diff; **Load N external images** |
| Folded file | One line: path, label and reason, counts, **Viewed**, **Show changes** | `quietCard()` → `.mr-quiet` | For skippable files ([ADR 0021](../adr/0021-suggested-order-and-folded-files.md)) and for files the reviewer folded or marked Viewed |
| File comments | Threads on the whole file, or whose line is gone | `.mr-file-threads` | Listed under the byline |
| Request overview | The pull or merge request's title, author and description as the first document | `renderOverview()` | Off by default (**Settings → Review → Title & description**) |

### Inside a document

| Part | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Word edits | Inserted words highlighted, removed words struck through | `ins.mr-ins`, `del.mr-del` (`src/core/highlight.ts`) | Clean mode (<kbd>C</kbd>) hides them |
| Rewritten and new blocks | A block rewritten by more than 60% as old then new (`.mr-rewritten`); new blocks marked only by the margin bar; added table rows (`.mr-row-added`) | `src/ui/render.ts` | Removed blocks stay in place, muted, under a small label |
| Unchanged blocks | **N unchanged blocks**, one toggle per folded stretch | `src/ui/reading.ts` (`.mr-context-toggle`, `.mr-context-gap`) | <kbd>A</kbd> switches **Changed parts** and **Whole files** |
| Link changes | The new destination named in the text | `.mr-link-note` | For links whose text stayed the same |
| Held image | Host name and **Load** | `.mr-img-hold`, `.mr-img-load` | [ADR 0010](../adr/0010-external-images-behind-consent.md) |
| Alerts, tasks, tables, footnotes, front matter | GitHub-style alerts, task boxes, tables with cell edits, a metadata card | `.mr-alert-*`, `.mr-task`, `.mr-table`, `.mr-meta` | Front matter renders as a card |
| Diagram | A Mermaid figure; **Before** and **After** when edited; **View source** | `src/ui/diagrams.ts` (`.mr-diagram-view`, `.mr-diagram-version`, `.mr-diagram-source`) | Opens enlarged on click; invalid diagrams keep their source |

### Inside a code file

| Part | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Code lines | Old and new line numbers, `+` / `−`, the line, wrapped under its indentation | `src/ui/code.ts`, `code-files.ts` (`.mr-code-line`, `.mr-code-number`, `.mr-code-sign`, `.mr-code-text`) | Two context lines around changes; signs optional (`no-signs`); syntax colours arrive later from the highlight frame |
| In this file | One quiet line naming changed functions, classes, methods and types | `src/ui/symbols.ts` (`.mr-symbol-plan`) | JavaScript and TypeScript with more than one change; each name links to its first changed line |
| Moved code | Its own tint, and **Moved to …** / **Moved from …** notes that link to the other end | `src/ui/moves.ts` (`.mr-move-note`, `.mr-move-link`) | At least two distinctive lines and 40 characters |
| Code comments | Comments as formatted notes beside their code, labelled with their lines | `src/ui/source-comments.ts` (`.mr-source-comment`) | **Settings → Review → Code comments → Source** shows them as written |
| Test plan | Summary, counts, **Browse tests**, suites as headings, each test as a card | `src/ui/specs.ts` (`.mr-spec-plan`, `.mr-spec-summary`, `.mr-spec-browse`) | **Whole file (raw)** switch per file; **Settings → Review → Test files** for all |

### Comments

| Part | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Selection chip | **Comment** above selected text | `.mr-select-chip`, `[data-act="comment-selection"]` | Explains why when a selection crosses files or mixes old and new text |
| Add a comment… | A full-width **Add a comment…** level with the block under the pointer, in the comments column; a small **Comment** button beside the text when the column is busy there | `.mr-comment-btn` (`is-lane`, `is-gap`, `is-beside-code`), `[data-act="comment-block"]` | Mouse only; on touch screens, tap a paragraph; key <kbd>R</kbd> |
| Editor | A card with the quote, the target ("Comment on lines 31–37"), the field, status line, **Cancel** and **Comment** | `createEditor()` → `.mr-composer`, `.mr-comment-target`, `.mr-comment-status` | Opens level with its text, which stays tinted (`.mr-targeted`); ⌘/Ctrl Enter posts; <kbd>Esc</kbd> leaves and keeps the draft; says in advance when it will post a file comment instead of an inline one |
| Thread card | Author, time, text, **Reply**; replies on a thread line | `threadCard()` → `.mr-thread`, `.mr-reply` | Level with its anchor in the comments column; pointing at it tints its text (`.mr-linked`); your own threads carry a hint of the accent |
| Reply editor | The reply box under the comment being answered | `replyEditor()` | Starts with an @mention when answering a reply |

### Feedback and states

| Surface | What the reviewer sees | Code | States and notes |
| --- | --- | --- | --- |
| Loading | Grey bars in the shape of a document | `skeleton()` → `.mr-skeleton` | Per file while it loads |
| Message | A heading, an explanation and **Back to the diff** | `showMessage()` → `.mr-message` | Load errors use `ReaderError` message and hint; a missing token adds the token instructions |
| No documents | "No document changes" and **Reading settings** | `.mr-empty-reader` | Offers turning on **Code files** |
| Toast | A short message at the bottom, sometimes with **View on platform** | `toast()` → `.mr-toast` (`role="status"`) | Hides after 6 seconds; "Comment posted", "Layout: Review", "You have an unsent comment…" |
| Resume offer | "Pick up where you left off: guide.md" with **Continue** and **×** ("Start from the top") | `.mr-resume` (`role="status"`) | Offered when a review is reopened at its start; gone once reading moves on |

## The repository reader

Its own shadow root under `#galley-repo-reader` (`#galley-repo-reader-dev` in development), with the reader's palettes, typography and components (`src/ui/repo-reader.ts`, `src/ui/repo.css`; views built in `src/ui/repo-views.ts` from the shared builders in `src/ui/dom.ts`). Clicks go through `RepoReader.onClick()`, changes through `onChange()`, forms through `onSubmit()`, by `data-act`.

| Surface | What the reader sees | Code | States and notes | Tested in |
| --- | --- | --- | --- | --- |
| Launcher | **Read the project**, no count, on repository, folder and Markdown file pages | `src/ui/launcher.ts` | **×** "Hide for this repository" | `launcher.test.ts`, `e2e/repo.mjs` |
| Top bar | Close, wordmark, **Back** / **Forward**, the document name (the documents list), the views, the commit, settings | `.mr-topbar`, `.mr-repo-history`, `.mr-repo-views`, `.mr-repo-commit` | Views **This review** (only from a review), **Read**, **Map** (<kbd>M</kbd>), **Notes** (<kbd>N</kbd>): words on wide screens, icons up to 760 pixels; the commit is a refresh button, disabled when pinned. Opened from a review, close reads "Back to the review (Esc)" | `repo-reader.test.ts`, `repo-review.test.ts` |
| Project library browser | Outline of folders, search, what the listing could not cover | `.mr-repo-docs`, `.mr-repo-outline`, `.mr-repo-search` | <kbd>/</kbd>; documents a review changes carry **Changed** (`.mr-chip.is-modified`) | `repo-map.test.ts` |
| Settings sheet | **Reading settings**, three tabs: **Reading** (the review reader's own, plus **External images**), **Layout** and **Keys** | `settingsSheet()` from `settings-sheet.ts` → `.mr-settings` → `.mr-settings-panel` | Shared sheet and Reading preferences; `layoutPanel('library')` from `layout-controls.ts` offers Focus / Balanced / Wide text with `LibraryLayout` session state; <kbd>L</kbd> cycles them without changing the review; keys <kbd>,</kbd> and <kbd>?</kbd>; the reader behind is `inert` | `repo-reader.test.ts` |
| Byline | Read time, type, status, path and commit, **Add a note**, **Open on GitHub** | `.mr-byline`, `.mr-chip` (the type; `is-own` when the reader set it), `.mr-repo-at`, `[data-act="note-here"]` | **Changed in this review** (`.mr-chip.is-modified`) when opened from one | `repo-reader.test.ts` |
| Linked from | Documents that link here, with each link as evidence | `.mr-repo-backlinks` | **Find links to this document** while not everything is read | `repo-map.test.ts` |
| Map: Documents | One document in the middle; **Linked from** and **Links to** columns; **Links the map cannot follow** | `.mr-repo-map`, `.mr-map-grid`, `.mr-map-center`, `.mr-map-col`, `.mr-map-problems` | **Index more** / **Stop reading**; type editor (`.mr-map-kind`: a **Type** row with a select, and an **Everything in …/** switch); after a refresh, **Since …** (`.mr-map-since`) lists changed links and notes to look at | `repo-map.test.ts`, `repo-lenses.test.ts`, `e2e/repo.mjs` |
| Map lenses | **Documents**, **Architecture**, **Infrastructure**, **Decisions** | `.mr-lens-switch`, `[data-act="lens"]`, `lensView()` → `.mr-lens` | Origins as chips: **Documented** and **Declared in configuration** plain, **Proposed by you** `.mr-chip.is-own`, **Unverified suggestion** `.mr-chip.is-unverified` (hollow dot); items listed like the documents menu (`.mr-menu-item`); **Read configuration** (`[data-act="read-configs"]`) and what was not read (`.mr-lens-configs`); the caveat (`.mr-lens-caveat`); **Propose something the files do not show** (`form[data-act="propose-entity"]`, a composer card with an **About …** switch), **Connect** (`form[data-act="propose-relation"]`), type (`[data-act="entity-kind"]`), **Remove** | `repo-lenses.test.ts`, `e2e/repo.mjs` |
| Notes | **Your notes**: **Save**, **Export…**, **Delete all notes…**; the add form; notes by kind; alternatives side by side | `notesView()` → `.mr-notes`, `form[data-act="add-note"]` (a composer card), `.mr-note` (a thread card, `.mr-thread.is-own`), `.mr-notes-compare` | State line (`.mr-notes-state`, `role="status"`) in a byline: "Nothing saved yet", "Unsaved changes", "Saved …"; recovery offer in the resume pill (`.mr-resume.mr-notes-recover`, **Recover** and **×**); two-step delete (`.mr-notes-confirm`); anchor states and **Reconfirm** / **Detach**; **Connect…** opens one note's choices at a time | `repo-notes.test.ts`, `e2e/repo.mjs` |
| Export | **Export notes**: a switch for each note, **Markdown** / **Mermaid**, the preview, **Copy**, **Download**, **Open a new issue…** | `.mr-settings.mr-repo-export` → `.mr-settings-panel` (`role="dialog"`, `aria-modal`) ← `exportSheet()` | A sheet like the settings; only the notes switched on are included, for this visit only; <kbd>Esc</kbd> closes it first; the issue link is offered only while the text fits in an address | `repo-notes.test.ts`, `e2e/repo.mjs` |
| This review | Each changed file by chapter, with the documents that link to it | `.mr-repo-review` → `reviewView()` | Chips: **Changed in this review** (`.mr-chip.is-modified`) and **Worth checking: …** (a plain chip) | `repo-review.test.ts`, `reader-project.test.ts` |
