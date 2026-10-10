# Galley user guide

Learn how to read changes in context, discuss them with your team and adjust Galley to suit you. This guide covers the reader, settings and GitHub and GitLab setup.

- [Opening a review](#opening-a-review)
- [The reader](#the-reader)
- [Settings](#settings)
- [Documents](#documents)
- [Code](#code)
- [Diagrams](#diagrams)
- [Comments and replies](#comments-and-replies)
- [Viewed progress](#viewed-progress)
- [Project library and the project map](#project-library-and-the-project-map)
- [GitLab](#gitlab-gitlabcom-and-self-managed)
- [GitHub](#github-githubcom-and-enterprise-server)
- [The demo](#the-demo)

## Opening a review

Open a pull or merge request and press **Read** in the bottom-right corner. The number on the button counts the changed documents (Markdown files), or the supported source files when a request changes no documents. Every changed document then appears in one continuous stream, with a small divider between files. A new or deleted file says so in its byline.

You can also open Galley's toolbar popup and choose **Read this review**, or press <kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>R</kbd>. On repository pages, the popup offers **Read the project** instead. The browser's extension shortcut settings let you change **Read this page in Galley**; the suggested shortcut may already be taken by another extension.

Prefer opening from the toolbar? Choose **Settings…** in the popup and turn off **Read button on the page**. This hides both page buttons and stops the requests used to count a review's files. Files are fetched only when you ask to open the reader. Turning it off keeps an open reader and its drafts in place; opening again focuses that reader.

Optionally, the request's own title and description come first (**Settings → Review → Title & description**), and changed source and configuration files follow the documents (**Settings → Review → Code files**). Both are off by default and remembered for future reviews. Code contents are fetched only when code files are on.

## The reader

- **The top bar** names the current file (a status dot, its name and position), steps through changes, holds a **Viewed** toggle and opens the settings. Choosing the file name opens the document menu: every changed file with its folder, status and viewed progress, under the request title.
- **Wide screens** set the text the way a reading site does: centred at a comfortable line length, the contents in the margin to its left and the comments column in the margin to its right. The text moves left only when the comments would otherwise get too narrow. Below 1280 pixels everything reads in one column, with comments under the paragraphs they discuss.
- **The margin** carries thin change bars beside changed Markdown blocks: one colour each for added, edited and removed.
- **Unchanged content** folds. By default you see the changed parts and the headings above them; each folded stretch has one **N unchanged blocks** toggle, even when it crosses lists or quotes. Press <kbd>A</kbd> (or **Settings → Review → Context → Whole files**) to read everything.
- **Files follow one another** on one page. Each opens with its place in the review, such as **File 3 of 8**, under a hairline that ends the file before it.
- **Pick up where you left off.** Galley remembers which file you were reading and how far into it, for your 50 most recent reviews, in this browser (as fingerprints: no addresses or paths are stored). Open a review again and **Continue** takes you back there; scroll on, or choose ×, to start from the top.

## Settings

Press <kbd>,</kbd> or the sliders in the top bar. The settings open as a sheet (a bottom sheet on phones) with four tabs.

**Settings…** in the toolbar popup opens the extension's separate settings page, where **Opening the reader** holds **Read button on the page**. The page button starts on; reading preferences and the opening choice are saved together in this browser.

| Tab | What it holds |
| --- | --- |
| **Reading** | Appearance (System, Light, Dark); Top glow, a soft wash of color that can be turned off; nineteen palettes in a carousel: Paper, E-ink, Cream, Sepia, Night, Blush, Sage, Seafoam, Slate, Nord, Dusk, Contrast, Ocean, Clay, Orchid, Graphite, Hackerman, Aurora and Sunset; the typeface (Galley's Newsreader and DM Sans pairing, Newsreader, DM Sans, Georgia, your system font or monospace); text size from 17 to 24 pixels, with a live preview. |
| **Layout** | **Balanced** (the text centred, contents and comments in its margins), **Files** (every file of the review in the left margin, the current one open to its headings, for large reviews), **Review** (a comments column as wide as the text, with larger comment text), **Wide text** (longer lines for tables, code and diagrams), **Focus** (the text alone, comments below it) and **Fit to screen** (everything grows with the window); then **Comfortable** or **Compact** density. |
| **Review** | Change marks (**Marked** or **Clean**), Context (**Changed parts** or **Whole files**), Title & description, Code files, + and − signs, Fold files you can skip, File order (**Suggested** or **As listed**), Test files (**Test plan** or **Whole file**), Code comments (**Formatted** or **Source**), and External images (**Ask** or **Load**). |
| **Keys** | Every keyboard shortcut. |

Every palette has a light and a dark appearance. Comment cards and formatted notes use quiet shaded surfaces. Dark mode keeps the page, code, cards and controls distinct without washing every layer in the accent colour. Borders identify editable fields; accents identify focus and selection, while green, amber and rose identify changes. Text and syntax colours are checked against their reading and diff backgrounds in every palette, light and dark. Fonts ship with the extension; nothing loads from a font service.

## Documents

Both versions of each document are parsed as GitHub-flavoured Markdown: tables, task lists, footnotes, alerts (`> [!NOTE]`) and front matter, which appears as a small metadata card.

- **Word edits** appear inside the sentence: inserted words tinted, removed words struck through. Changes to paragraph wrapping are not marked as text edits. A paragraph rewritten by more than 60% shows as the old version removed and the new one added.
- **New and removed blocks** stay in place: removed paragraphs, list items and table rows appear where they used to be.
- **Tables** are compared row by row, then cell by cell.
- **Links and images** whose text stays the same but whose destination changed are named in the text.
- **Changes that render nowhere** (HTML comments, link definitions) are counted in the byline and linked to the platform diff, so you can inspect changes that do not appear in the rendered document.
- **Emoji shortcodes** such as `:tada:` show as the emoji, as they do on GitHub and GitLab, in documents and comments alike. Emoticons such as `:)` and anything in code stay as written.
- **Clean mode** (<kbd>C</kbd>) hides the marks and reads the new version as it will be published, with quiet bars left in the margin.
- **Images** hosted on the review site load normally. Images hosted elsewhere wait behind a **Load** button, so a pull request cannot track who reads it; **External images: Load** changes that.

## Code

Code blocks in documents and source files are shown one line per block. Long lines wrap under their own indentation instead of disappearing past the edge, so nothing needs sideways scrolling. On wide screens source files run to 120 characters, and code blocks grow to their longest line, up to the same width.

- Source files keep their old and new line numbers and their `+` / `−` signs, with two context lines around each change and controls to reveal the rest. To read code without the signs, turn off **Settings → Review → + and − signs**; the tints and edges still show what changed.
- Changed lines get a faint tint and a coloured edge rather than a full fill. A file that is entirely new or deleted says so once, in its byline.
- Syntax colours come from highlight.js, bundled with the extension and run in a sandboxed frame only when code is on screen, so a pathological file cannot freeze the page. Both versions are highlighted as a whole, so strings and comments that span lines colour correctly.
- Binary files and unknown file types are left out. Source files over 500,000 characters show a link to the platform diff instead.

### Test files

With **Code files** enabled, JavaScript and TypeScript tests open as a test plan. It starts with a summary ("5 tests in 2 suites"), counts of tests added, edited, removed, unchanged and still **To do**, and **Browse tests**, an expandable list of every test under its suite: choose one to open it and jump there. **Added**, **Edited**, **Removed** and **Unchanged** describe changes to the source; Galley does not run tests or report their results.

Below the summary, suites are headings and each test is a card named after it, with its status, its flags (**Parameterized**, **Skipped**, **Only**, **To do**) and its lines. Changed tests open with their code in view. Unchanged imports start as one expandable **Imports & setup** row; changed imports stay open. The source stays available throughout, whatever the **Context** setting. Choose a test's name to fold its code away.

The heading already says what a declaration says, so lines that only repeat it are left out: the `it(…)` or `describe(…)` line, its closing `});`, a bare `it.todo(…)`. That holds for a renamed test too, whose heading shows the old and new words. A declaration line that says more, such as `async`, a timeout or a parameter table, stays, and so does any line with a discussion on it. Everything else is exactly the source: both diff versions, syntax colours, line numbers and comment targets. Dynamic names remain source expressions.

Choose **Whole file (raw)** above a test file to see every source line, including imports, setup, unchanged code and comments exactly as written. The switch stays visible so you can return to **Test plan**. The same choice is available under **Settings → Review → Test files → Whole file**, applies to every test file and is remembered.

Galley recognizes `.test` / `.spec` JavaScript and TypeScript filenames and files in `test`, `tests`, `spec`, `specs` or `__tests__` directories, including JSX/TSX. Common Jest, Vitest, Mocha and Playwright declarations are supported. Unsupported syntax, files without recognizable cases and parser failures keep the source view. To keep the reader responsive, the specification view is limited to 200,000 source characters, 10,000 diff rows and 500 declarations. The parser is bundled and runs in a sandboxed frame; test code is never executed.

### Code comments

Comments in source files read as formatted notes, set in the reading type beside the code they describe: Markdown inside them shows as emphasis, lists, links and code, and each note is labelled with its lines ("Doc comment · lines 1–11"). When a comment changed, its note shows the words that changed. A comment you post on a note lands on the matching source lines.

To see comments exactly as written, choose **Settings → Review → Code comments → Source**. Drafts stay open when you switch. Notes follow **External images** like any document, and very large files (over 200,000 characters, 10,000 rows or 500 comments) keep their comments as written.

Hover a code line or a paragraph in a formatted comment to highlight its source target and show **Add a comment…**. On wide screens this stays a full box, even beside an existing discussion, and remains available as you move into it. Choosing it opens the editor and keeps the source target highlighted while you write.

## Large reviews

Big requests are often big because of files nobody reads line by line, and code that only moved. Galley says which is which, so the reading goes to the rest.

### Folded files

These files fold to one line each, saying what the file is, why it is folded and how many lines changed:

- lockfiles, such as `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, `Gemfile.lock` and `go.sum`;
- minified files (`.min.js`, `.min.css`) and build output in a `dist` folder;
- vendored code in `vendor`, `node_modules`, `third_party` or `bower_components`;
- generated files, named like `.pb.go`, `_pb2.py` or `.generated.ts`, kept in a `generated` or `__generated__` folder, or marked `@generated` or `DO NOT EDIT` in their first five lines;
- test snapshots (`.snap` files and `__snapshots__` folders) and SVG images;
- edits that only change spaces, tabs or line breaks, except in languages where indentation is meaning, such as Python, YAML and Makefiles;
- renamed files whose text did not change.

Choose **Show changes** to read one. The document menu tags folded files and counts them. A file with a discussion on it is never folded, even when the discussion loads after the file. To read every file in full, turn off **Settings → Review → Fold files you can skip**.

### Reading order

With **Settings → Review → File order → Suggested**, the default, a review reads in the order you would explain it: documents first, then the code, each file followed by its tests, and last the files most reviewers skip. Tests are matched to their code by name and folder: `quota.test.ts`, `quota_test.go`, `test_quota.py` and `QuotaTest.java` follow `quota`, and so does a `quota` file in `__tests__`. **As listed** keeps the platform's order.

### Review chapters

Choose **Chapters** in the top bar, or press <kbd>M</kbd>, for a suggested path through the review. Chapters use the first two folder levels, keep documents separate from code, and put tests beside their source using the same name and nearest-folder matches as suggested reading order. Each chapter explains its grouping; these are folder names, not guesses about the author's intent. Supporting files have their own chapter.

**Start here** goes to the first unviewed readable file. After you mark files Viewed, it becomes **Continue here**. Reviews with six or more files also show a quiet chapter route and **Next chapter**. Choosing a folded file keeps it folded; choosing code while Code files is off turns that setting on. Progress counts explicit Viewed actions, never scrolling.

The chapter map includes folded files, failed loads and code currently turned off. Unsupported formats appear under **Other changed files**, with a link to the platform diff. **All files** always gives a flat list, and the original file menu remains available. A single-file review needs no chapter setup.

Choose **Edit chapters** to rename a chapter, add an optional introduction, move it earlier or later, or move a file to another chapter. **New chapter** creates a place for your own concern. These changes stay in the open session. Reordering keeps your reading position, Viewed state, folds and comment drafts. **Reset chapters** restores suggestions; choosing **Suggested** or **As listed** in File order restores that reading order.

### Moved code

When code is removed in one place and added in another, in the same file or a different one, both ends get a tint of their own instead of red and green, and a note: **Moved to src/quota.ts, line 3** at the old place and **Moved from src/limits.ts, old line 18** at the new one. Choose a note to go to the other end. Indentation is ignored, so code moved into a block or out of one still matches, and lines edited on the way stay ordinary changes inside the move. A comment that moved with its code says **Moved** too. The byline counts moved lines.

A match needs at least two distinctive lines, 40 characters between them, so a lone brace or `return` never counts as a move. Clean mode shows moved code as plain code.

### What changed, by declaration

JavaScript and TypeScript files with more than one change start with one quiet line, **In this file**, naming each function, class, method (as `Limiter.check`), interface, type and enum that changed, marked + added, • edited, → moved or − removed, then any other changes. A renamed function shows its old and new names. Choose a name to go to its first changed line. Declarations are read by the same sandboxed parser as test plans, and the code is never run.

## Diagrams

Fenced `mermaid` blocks render as diagrams, drawn in the reading palette, light or dark: rounded cards on a soft canvas, muted lines, small-capital group titles. Each diagram is shown at the size its text was laid out for, shrunk only to fit the column. Choose one to open it over the whole window: it starts with all of it in view (a small diagram grows up to twice its size), and from there you can zoom in to read the details of a large one. Pinch or use ⌘/Ctrl + scroll to zoom where the pointer is, double-click to zoom in, or use the − / + buttons and the <kbd>+</kbd> <kbd>−</kbd> keys; the percentage button and <kbd>0</kbd> fit it to the window again. Drag, scroll or use the arrow keys to move around. A click on the backdrop, the close button or <kbd>Esc</kbd> closes it.

Edited diagrams show **Before** and **After**; Clean mode shows the new version. **View source** reveals the Mermaid code, and pointing at either version offers a comment on the matching source fence. Invalid or unsupported diagrams keep their readable source. The engine is bundled and runs in a sandboxed frame that cannot reach the page, your session or the network; external images and icon packs are disabled, and diagrams are limited to 20,000 source characters and 300 edges.

## Comments and replies

Keep the discussion connected to the change. Choose text to comment on, and write your feedback beside it.

- **Start a comment** by selecting text and choosing the **Comment** chip above it, by pointing at a paragraph and choosing **Add a comment…** level with it in the comments column (or the small button beside the text when the column is busy there), or by pressing <kbd>R</kbd>. On touch screens, tap a paragraph.
- **The comments column offers it too.** On wide screens, point anywhere in the comments column and **Add a comment…** appears for the paragraph or line level with the pointer. On the way from a line to its **Add a comment…**, passing over other lines keeps it; pausing on one moves it there.
- **The editor opens beside its text**, which stays tinted; a selection stays highlighted and is quoted above the editor. Other cards move aside so it stays level. On narrow screens it opens below the paragraph. Pointing at a card tints the text it belongs to.
- **Comment locations** follow your selection: selected text is quoted exactly, and the comment anchors to the Markdown block(s) containing it. Removed paragraphs and old diagram versions target the old version. Source-file comments target the selected line or line range. Selections that cross files or mix old and new text are rejected with an explanation.
- **Drafts** stay until you post them or choose **Cancel**. Leave one, comment elsewhere, come back: choosing the same text again returns to its draft, and an editor you never wrote in closes by itself. <kbd>Esc</kbd> leaves an editor and keeps what you wrote; the reader stays open while a comment is unsent.
- **Replies.** Every comment has a **Reply** action; the reply box opens under that comment. GitHub and GitLab threads are flat, so an answer to a reply joins the same thread and starts by mentioning the person it answers.
- **Existing threads** load with the review and sit beside their paragraphs: authors (as the platform names them), times and the comment text, rendered through the same sanitiser as documents. File comments and threads whose line is gone are listed under the document's byline.

Comments use the platform's own review APIs, [GitHub review comments](https://docs.github.com/en/rest/pulls/comments#create-a-review-comment-for-a-pull-request) and [GitLab discussions](https://docs.gitlab.com/api/discussions/#create-a-new-thread-in-the-merge-request-diff), so other reviewers see ordinary platform comments. When the anchored lines are outside the available diff (including omitted or truncated patches), the editor says it will post a quoted GitHub file comment or a GitLab discussion instead of an inline comment. Posting checks the current review revision first. A failed post keeps the draft, and writes are never retried automatically; if a network failure leaves the result uncertain, check the platform before posting again.

## Viewed progress

Mark a file **Viewed** in the top bar (<kbd>V</kbd>) or beside **Fold** at the end of its byline, and it folds to one line, as on GitHub; uncheck it to open it again. Files you already viewed start folded, and a folded file you open yourself stays open. The document menu shows progress and a check beside finished files.

Any file folds the same way: choose **Fold** in its byline, and **Show changes** on the folded line to read it again, just as you left it.

With a GitHub token, Galley reads and updates GitHub's native [Viewed status](https://docs.github.com/en/graphql/reference/pulls#markfileasviewed), including unmarking; these requests check that the review revision is still current, and a failure leaves the previous state and shows an error. Without a token, and on GitLab, progress stays in this browser, keyed to a fingerprint of the file's old and new contents: it resets when that file changes, and unrelated updates keep it. The button's tooltip says where progress is saved.

## Project library and the project map

Galley also reads a project's own documentation, outside any review: its README, specs, decision records and guides, with the same typography, diagrams and settings. Its **Reading settings** (the sliders icon, or <kbd>,</kbd>) share the review reader's **Reading** tab, plus **External images**, and add **Layout**; <kbd>?</kbd> lists its keys.

**Opening.** On a repository's main page, one of its folders or one of its Markdown files on GitHub or GitLab, press **Read the project** in the bottom-right corner. Nothing is fetched until you do. From a Markdown file the reader opens that document at once; from a folder it opens the folder's README, or its first document. Hiding the button with × hides it for that repository.

**One commit.** Galley resolves the branch, tag or commit the page shows to one commit, and reads every document at that commit while the reader is open. The commit is shown in the top bar and under each title. Choose it to check for a newer commit: if the branch has moved, Galley says so and starts over at the new one. A page for a specific commit has nothing newer to check.

**Reading.** Documents are read as they are: no change marks, comments or Viewed. Relative links to other Markdown documents open in the reader at the same commit, and a link to a folder opens its README. Links to source files and other formats open on the platform in a new tab, as does any link you open with ⌘/Ctrl or Shift. Section links scroll to the section and say when it does not exist. **Back** and **Forward** (or <kbd>Alt</kbd> <kbd>←</kbd> / <kbd>Alt</kbd> <kbd>→</kbd>) return to the paragraph you left, at any window width. In Balanced and Wide text, longer documents list their headings in the left margin on wide screens.

**Layouts.** Project library starts in **Focus**: a centred article, with navigation available from the document name. In **Reading settings → Layout**, choose **Balanced** for contents beside the article or **Wide text** for tables, code and diagrams. <kbd>L</kbd> cycles these three choices. Narrow screens stay in one column. Switching layout keeps the paragraph in view. The choice lasts for this library visit; it never overwrites the review's layout. Typography, palette and Comfortable / Compact density remain shared preferences.

**Documents.** Choose the document name in the top bar, or press <kbd>/</kbd>, for every Markdown document at that commit as an outline of folders, README first. Type to find a document by its path or title; once Galley has read documents for the map, their headings are found too and open at that section. Anything the listing could not cover is named at the top, such as a repository too large to list in one go.

**Map.** Press **Map** (or <kbd>M</kbd>) to see the document you are reading in the middle, the documents that link to it on one side and the ones it links to on the other. Every connection lists the links that make it, with their text, section and line; choose one to read that paragraph. Choose a document to move it to the middle, and **Read** to open it. Folders appear as where a document lives, never as a connection: only links someone wrote connect documents. Links to documents that are not listed, or to sections that do not exist, are listed under **Links the map cannot follow**.

The map is built from what documents say. Galley reads up to 150 documents at a time, four at once, and says how many it has read; **Stop reading** stops a pass and **Index more** continues. Documents that cannot be read or are too large are counted, never guessed at. **Linked from**, under every document, uses the same documents.

**Types.** Each document gets a type (Overview, Spec, Decision, Architecture, Runbook, Guide or Document), and Galley says where it came from: the document's front matter (`type`, `kind` or `category`), a guess from its path (a README, `adr/`, `rfcs/`, `ADR-0001-…`), or you. In the map, change a document's type, or apply it to everything in its folder; your types are kept with your notes when you save them. A decision's or spec's **status** comes from its front matter or its Status section.

**Architecture, Infrastructure and Decisions.** Above the map, switch from **Documents** to another view of the same repository. Everything in them says where it comes from, in words: **Documented** (a document says it), **Declared in configuration**, **Proposed by you**, or **Unverified suggestion**.

- **Architecture** and **Infrastructure** show what the repository's configuration declares: services and their dependencies in Compose files; workflows, jobs and environments in GitHub Actions and `.gitlab-ci.yml`; Kubernetes workloads under `k8s/`, `deploy/` and similar folders; Terraform resources and modules. Galley reads these files only when you press **Read configuration**, in a sandbox, and never runs anything in them. Declared means what the files ask for at that commit, not what is running. What could not be read is said: files too large, included files, references between Terraform resources. Choose an item to see the line that declares it and its connections. A document that names an item by its whole name is listed as an unverified suggestion that it may describe it, with the line; Galley never claims more.
- Add what the files do not show under **Propose something the files do not show** (a component, a data store, an environment), optionally about the document you are reading, and connect it to other items. A declared item's type can be changed too; the type the file gives stays visible beside yours. Proposals are yours, marked as yours, and kept with your notes when you save them.
- **Decisions** lists decision records and specs with their status, which records supersede which (from front matter `supersedes` / `superseded-by`, or links in the Status section), the RFCs they name and the records and specs they link to. When the front matter and the Status section disagree, both are shown.

**Notes.** Press **Notes** (or <kbd>N</kbd>), or **Add a note** under a document's title, for your own ideas, questions, assumptions, next experiments and alternatives. A note can be about the document you are reading, or one of its sections; give alternatives the question they answer and they sit side by side to compare. **Connect…** tentatively connects a note to another note or to an item in the architecture views. Notes are private to this browser and **saved only when you press Save**; until then they are kept as a draft, and a draft left from an earlier visit is offered at the bottom of the page: **Recover** it, or **×** to discard it. **Delete all notes…** asks first, then removes every note, proposal and type you set for that repository. Up to 500 notes are kept per repository.

When a newer commit changes the section a note is about, the note says so: **Reconfirm** once you have read it again, or **Detach** a note whose section is gone. After a refresh the map also says which links changed among the documents read at both commits, and how many notes need another look.

**Export.** **Export…** opens a sheet like the settings that shows exactly what would leave: only the notes you switch on in it, as Markdown or as a Mermaid flowchart, every note labelled a proposal and every source linked at its commit. **Copy** or **Download** it, or **Open a new issue…** to open the platform's own new-issue form in a new tab with the text filled in; nothing is posted unless you submit it there.

**From a review: Project library.** In a pull or merge request, **Library** in the top bar (or **Project library** at the end of the files list on a phone) opens the repository's docs over the review, at the review's **head** (as the change leaves them) or its **base** (before it). It starts at **This review**: each changed file, chapter by chapter, with the documents read so far that link to it and the links that connect them, flagged **Changed in this review** or **Worth checking**. Galley never says a document is wrong. Changed documents are flagged in the documents list, the byline and the map. Close the library (<kbd>Esc</kbd>) to come back to the review exactly where you were, drafts included.

**What is kept.** Your history and the map last while the reader is open. Notes, proposals and the types you set are kept only when you save them. The reading settings you change (appearance, text size, external images) are saved, the same ones the review reader uses.

**Requests.** On GitHub, opening uses one small API request to resolve the commit, and the documents list one more for the whole tree. A tree too large for one listing is listed again by documentation folder (`docs/`, `specs/`, `adr/` and the like), in at most seven more. Documents are read with your GitHub session, like pull request files, and use no API quota. On GitLab, everything uses your signed-in session. Configuration files are read the same way as documents, only when you ask. Markdown is supported; MDX is read as Markdown and its components are never run, and other formats open on the platform.

## GitLab (gitlab.com and self-managed)

Nothing to configure: Galley reads the merge request with your signed-in session, and comments use the page's CSRF token. On a self-managed instance, click the Galley icon in the browser toolbar and choose **Enable on git.example.com**; the extension then gets access to that one domain. Nested groups and instances under a sub-path work.

## GitHub (github.com and Enterprise Server)

Public repositories work without setup. GitHub allows 60 API requests an hour without a token; Galley uses three for a pull request with up to 100 files, one more per further page of files, and one comparison request when a patch is omitted. Posting a comment also checks that the reviewed version is still current.

Private repositories need a token, because GitHub's API does not accept the browser session. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with read-only **Contents** and **Pull requests** access to the repositories you review, then paste it into the Galley popup. To comment, give it **Pull requests: read and write**; **Contents** can stay read-only.

The token is kept in Galley's own extension storage, which web pages (GitHub's included) cannot read. Requests that need it are made by Galley's background worker, never from the page, and only for the few API calls the reader uses on the pull request or repository open in that tab. A repository page can only resolve a commit and list the files of that repository; a pull request page can also list its own repository's files, for Project library. Tokens are saved and sent only for https sites. For GitHub Enterprise Server, enable the site in the popup and save a token for it there; Galley first checks that the site answers like a GitHub Enterprise Server.

## The demo

The [live demo](https://m9rc1n.github.io/galley/demo/) runs the real reader on a sample merge request. It saves comments in session storage and Viewed progress locally, and never sends anything to GitHub or GitLab. To run it from a checkout: `npm install && npm run demo`, then open http://localhost:4173.

Add `?repo` to the demo URL to read a sample handbook as from a repository page: decision records, an RFC, an architecture note and a runbook that link to each other, with a missing document and a missing section for the map to find, and a Compose file, a workflow, Kubernetes manifests and Terraform for the architecture views. `?repo=docs/adr/0003-queue-for-reviews.md` starts at one document. In the sample review, **Project library** opens the same handbook at the merge request's base or head. Notes in the demo are kept in that browser's local storage.

Add `?spec` to the demo URL to try a test-file review with nested suites, renamed cases, added and removed behaviors, and a comment on a changed assertion.
