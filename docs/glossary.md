# Glossary

The words Galley uses, what they mean, and what they are called in the code. User-facing terms follow [COPY.md](COPY.md); use them in the interface, docs and pull request titles.

| Term | Meaning | In the code |
| --- | --- | --- |
| **Review** | A GitHub pull request or GitLab merge request | `ReviewSource` (`src/platforms/types.ts`) |
| **Platform** | GitHub or GitLab, cloud or self-hosted | `src/platforms/`, `detectContext()` |
| **Document** | A changed Markdown file, shown as a readable article | `DocRef` without `kind` |
| **Code file** | A changed, supported source or configuration file; shown when **Code files** is on | `DocRef` with `kind: 'code'`, `codeDocs` |
| **Other changed files** | Changed files Galley cannot render; listed in the chapter map with a link to the platform diff | `otherFiles` |
| **Base / head** | The old and new versions of a file | `DocContents.base`, `.head`; comment `side: 'base' \| 'head'` |
| **Unit** | A leaf block of a document (paragraph, heading, list-item text, table, code block) with its source lines; the grain of change detection | `Unit` (`src/core/markdown.ts`) |
| **Block** | A rendered unit, as targeted by comments and margin bars | `RenderedBlock` (`src/ui/render.ts`) |
| **Edits in context** | Changed words shown in their sentences, table edits in cells, changed code with nearby lines | `ins.mr-ins`, `del.mr-del` |
| **Change marks: Marked / Clean** | Whether inserted and removed text is highlighted | `settings.mode`: `changes` / `clean` |
| **Context: Changed parts / Whole files** | Whether unchanged blocks fold away | `settings.scope`: `changed` / `all` |
| **Unchanged blocks** | A folded stretch of unchanged content, opened in place | `src/ui/reading.ts` |
| **Folded file** | A file shown as one line: skippable files, files the reviewer folded, files marked Viewed | `View.quiet`, `View.folded`, `.mr-quiet` |
| **Files you can skip** | Lockfiles, generated, vendored, minified and build output, snapshots, SVG, whitespace-only edits, unchanged renames | `quietFile()`, `quietPath()` (`src/core/quiet.ts`) |
| **Suggested order / As listed** | Documents, then code each followed by its tests, then skippable files; or the platform's order | `readingOrder()` (`src/core/order.ts`), `settings.order` |
| **Chapter** | A group of related files with a reason, in the chapter map | `ReviewChapter` (`src/core/chapters.ts`), `ChapterMap` (`src/ui/chapters.ts`) |
| **Moved code** | Code removed in one place and added in another, with notes at both ends | `MoveFinder` (`src/ui/moves.ts`) |
| **In this file** | The line naming changed declarations in a JavaScript or TypeScript file | `src/ui/symbols.ts` |
| **Test plan** | A test file read as suites and cases | `src/ui/specs.ts`, `spec-frame` |
| **Code comments: Formatted / Source** | Comments in code as Markdown notes, or as written | `settings.codeComments`, `src/ui/source-comments.ts` |
| **Viewed** | A file the reviewer marked as reviewed; synced with GitHub with a token, else kept locally | `toggleViewed()`, `src/ui/viewed.ts`, `src/platforms/github-viewed.ts` |
| **Fingerprint** | A SHA-256 hash standing in for an address, path or contents, so nothing readable is stored | `viewedKey()`, `positions.ts` |
| **Comment target** | Where a comment lands: file, side, lines, quote | `CommentTarget` |
| **Comment plan** | How a comment will be posted: inline, file comment or discussion | `CommentPlan` |
| **Repository reader** | A project's own docs read outside any review, at one commit | `RepositorySource`, `src/ui/repo-reader.ts` |
| **Snapshot** | Everything read at one resolved commit; a refresh to a newer commit starts a new one | `RepositorySource.commit`, `refresh()` |
| **Project map** | The documents and their links, one document in the middle; also the architecture, infrastructure and decision views | `ProjectIndex` (`src/core/docindex.ts`), `buildLens()` (`src/core/architecture.ts`) |
| **Lens** | One view of the map: Documents, Architecture, Infrastructure or Decisions | `LensName` |
| **Origin** | Where an item on the map comes from: Documented, Declared in configuration, Proposed by you, Unverified suggestion | `Origin`, `ORIGIN_NAMES` |
| **Declared** | What a configuration file asks for at the commit read; never what is running | `DeclaredItem`, `config-frame` |
| **Note** | The reader's own idea, question, assumption, next experiment or alternative about a repository | `Note`, `Thinking` (`src/core/notes.ts`) |
| **Anchor** | The document section a note is about, with the commit and a fingerprint of the section, to say when it changes | `Anchor`, `anchorState()` |
| **Project docs** | A review's repository read at its base or head, over the review | `ReviewSource.project`, `ReviewProject` |
| **Thread** | An existing platform conversation anchored to a line | `Thread` |
| **Draft** | An unsent comment or reply; kept while the reader is open | `Draft`, `Editor`, `ReplyEditor` in `reader.ts` |
| **Comments column** | The right margin on wide screens where cards sit level with their text | `.mr-threads` ("the rail" in code comments) |
| **Contents** | Headings of the current document in the left margin | `.mr-toc` |
| **Byline** | The line under a file's title: reading time or language, status chips, Viewed and Fold | `byline()` → `.mr-byline` |
| **Margin bars** | Thin coloured bars beside changed blocks | `.mr-gutter`, `.mr-mark` |
| **Launcher** | The floating **Read** button on a review page | `Launcher` (`src/ui/launcher.ts`) |
| **Reader** | The full-window overlay where reviews are read | `Reader`, `openReader()` (`src/ui/reader.ts`) |
| **Palette / Appearance** | The colour set (nineteen) / System, Light or Dark | `settings.theme` / `settings.appearance`; `data-theme`, `is-dark` |
| **Layout / Density** | How wide screens are shared (six) / Comfortable or Compact | `settings.layout`, `settings.density`; `data-layout`, `data-density` |
| **Sandbox frame** | An isolated extension page running a third-party engine | `sandbox()` (`src/ui/sandbox.ts`), `*-frame.ts` |
| **Background worker** | The extension's service worker; the only holder of GitHub tokens | `src/background/worker.ts` |
| **Allowlist** | The GitHub API calls the worker will make | `allowedRequest()` (`src/platforms/github-api.ts`) |
| **Development build** | `npm run dev`: orange icon, DEV badges, live reload, separate storage | `__GALLEY_DEV__` |
| **ADR / RFC** | A recorded decision / a proposal open for discussion | [`docs/adr/`](adr/README.md), [`docs/rfcs/`](rfcs/README.md) |

The `mr-` prefix on classes and the `--rail` and `--toc` custom properties come from the project's first name, mreadie ("markdown reader").
