# Architecture

How Galley is put together: what runs where, how a review gets from GitHub or GitLab onto the screen, and where to find each part. For why it is built this way, follow the links to the [decision records](../adr/README.md).

- [System context](#system-context)
- [Runtime components](#runtime-components)
- [Opening a review](#opening-a-review)
- [Rendering a document](#rendering-a-document)
- [Posting a comment](#posting-a-comment)
- [Module map](#module-map)
- [The `ReviewSource` contract](#the-reviewsource-contract)
- [Build outputs](#build-outputs)
- [Invariants](#invariants)

Related: [Security model](security-model.md) · [Storage inventory](storage.md) · [UI map](../design/ui-map.md) · [Glossary](../glossary.md)

## System context

Galley is a browser extension with no server ([ADR 0002](../adr/0002-no-server-no-telemetry.md)). It talks only to the GitHub or GitLab site the reviewer is on.

```mermaid
flowchart LR
  R(["Reviewer"]) --> B["Browser with Galley"]
  B -- "reads files, threads;<br/>posts comments" --> P["GitHub or GitLab<br/>(cloud or self-hosted)"]
  B -. "only after Load" .-> I["Image hosts<br/>named in documents"]
  T(["Teammates"]) --> P
```

## Runtime components

```mermaid
flowchart TB
  subgraph Page["Review page (github.com, gitlab.com, enabled self-hosted sites)"]
    CS["Content script<br/>src/content/main.ts"]
    L["Launcher: Read button<br/>src/ui/launcher.ts"]
    subgraph Shadow["#galley-reader shadow root"]
      RD["Reader<br/>src/ui/reader.ts + reader.css"]
      DF["diagram-frame<br/>(Mermaid)"]
      HF["highlight-frame<br/>(highlight.js)"]
      SF["spec-frame<br/>(Babel parser)"]
    end
  end
  subgraph Ext["Extension context"]
    W["Background worker<br/>src/background/worker.ts"]
    PU["Toolbar popup<br/>src/popup/"]
    DB[("Extension IndexedDB<br/>GitHub tokens")]
    ST[("chrome.storage.local<br/>settings, progress, sites")]
  end
  CS --> L --> RD
  RD <-- "MessageChannel,<br/>one request at a time" --> DF & HF & SF
  CS -- "runtime message:<br/>allowlisted GitHub call" --> W
  W --> DB
  PU --> DB
  PU --> ST
  RD --> ST
  W -- "token-bearing request" --> GH["GitHub API"]
  CS -- "same-origin fetch,<br/>reviewer's session" --> PL["GitHub raw files,<br/>GitLab API"]
```

| Component | Runs in | Can reach | Cannot reach |
| --- | --- | --- | --- |
| Content script | The review page's renderer | The page's DOM and origin (the reviewer's session), `chrome.storage.local`, runtime messages | GitHub tokens |
| Reader | The same content script, inside a shadow root | Its own DOM, settings and progress storage | The page's styles, tokens |
| Sandbox frames | Sandboxed extension pages with opaque origins | Only the `MessagePort` the reader hands them | The page, the session, extension APIs, storage, the network |
| Background worker | The extension's service worker | Tokens, the GitHub API (allowlisted calls only), `chrome.scripting` for enabled sites | Page DOM |
| Popup | An extension page | Tokens (save and remove), site permissions | Review content |

## Opening a review

```mermaid
sequenceDiagram
  autonumber
  participant P as Review page
  participant C as Content script
  participant A as Platform adapter
  participant W as Background worker
  participant G as GitHub or GitLab
  participant R as Reader
  P->>C: document_idle, turbo:load, popstate, or URL change (polled each second)
  C->>C: detectContext(): is this a pull or merge request?
  C->>A: loadSource(context)
  A->>W: GitHub: allowlisted API calls (token attached here if saved)
  W->>G: pull request, files (paginated)
  A->>G: GitLab: API with the session
  A-->>C: ReviewSource (files, links, load(), threads, comment plans)
  C->>P: Launcher shows "Read" and a count
  P->>R: reviewer presses Read
  R->>A: load(doc) for each file, in reading order
  A->>G: head from the same-origin raw URL; base rebuilt from the patch (GitHub) or fetched at the merge base (GitLab)
  R->>R: render, diff, sanitise, lay out
  R->>A: loadThreads(), Viewed state
```

Sources are cached per review, so reopening the reader on the same review is instant; saving or removing a token in the popup reloads the open review on that site without a page reload. See [ADR 0007](../adr/0007-rebuild-github-base-from-the-patch.md) for how GitHub versions are loaded within the unauthenticated rate limit.

## Rendering a document

```mermaid
flowchart LR
  B["base text"] --> P1["parseDocument()<br/>markdown-it → units<br/>with source lines"]
  H["head text"] --> P2["parseDocument()"]
  P1 & P2 --> BD["diffUnits()<br/>block diff:<br/>same, added, removed, edited"]
  BD --> WD["wordDiff()<br/>Intl.Segmenter tokens,<br/>bounded work"]
  WD --> S["sanitize()<br/>DOMPurify, nonce ids,<br/>parked images"]
  S --> M["highlight.ts<br/>ins / del marks"]
  M --> D["RenderedDoc:<br/>content, blocks, stats,<br/>diagrams, held images"]
  D --> F["reading.ts<br/>fold unchanged blocks"]
  D --> X["Sandbox frames:<br/>diagrams, colours,<br/>test plans"]
```

Source files take a parallel path (`src/ui/code-files.ts`): one block per line, old and new line numbers, two lines of context, then enhancements that each degrade to plain source when they cannot apply: syntax colours, moved code, the declaration line, formatted comments and test plans. Details: [ADR 0003](../adr/0003-parse-and-compare-markdown-in-the-browser.md), [ADR 0006](../adr/0006-sanitise-all-rendered-html.md), [ADR 0011](../adr/0011-sandbox-third-party-engines.md), [ADR 0020](../adr/0020-read-code-statically.md).

## Posting a comment

```mermaid
sequenceDiagram
  participant U as Reviewer
  participant R as Reader
  participant A as Platform adapter
  participant G as GitHub or GitLab
  U->>R: select text, Add a comment…, or R
  R->>R: selectionTarget() / paragraphTarget(): doc, side, lines, quote
  R->>A: prepareComment(target)
  A-->>R: CommentPlan: inline, file or discussion, with a label
  R->>U: editor beside the text, saying where it will post
  U->>R: Comment (⌘/Ctrl Enter)
  R->>A: plan.post(body)
  A->>G: check the revision is current, then create the comment once
  G-->>A: URL
  A-->>R: URL and a reply() for the new thread
  R->>U: thread card and "Comment posted · View on platform"
```

A failure keeps the draft; writes are never retried ([ADR 0008](../adr/0008-comment-through-platform-review-apis.md)).

## Module map

| Folder | Responsibility | Key files | Environment |
| --- | --- | --- | --- |
| `src/content/` | Page detection, launcher, single-page navigation, token-change signal | `main.ts` | Page (jsdom in tests) |
| `src/platforms/` | GitHub and GitLab adapters behind `ReviewSource`; detection; HTTP with retries; comments and threads; Viewed sync; tokens and enabled sites | `types.ts`, `index.ts`, `detect.ts`, `github.ts`, `github-api.ts`, `github-queries.ts`, `github-viewed.ts`, `gitlab.ts`, `comments.ts`, `http.ts`, `tokens.ts`, `sites.ts` | Node in tests |
| `src/core/` | Pure logic, no DOM: Markdown units, block and word diffs, limits, DOM highlighting of ops, patch reversal, paths and links, reading order, folded-file rules, chapters | `markdown.ts`, `blockdiff.ts`, `worddiff.ts`, `limits.ts`, `highlight.ts`, `patch.ts`, `paths.ts`, `order.ts`, `quiet.ts`, `chapters.ts` | Node in tests |
| `src/ui/` | The reader: overlay, rendering pipeline, settings, storage of progress and positions, sandbox frames and their clients, code views, chapters UI | `reader.ts`, `reader.css`, `render.ts`, `reading.ts`, `settings.ts`, `viewed.ts`, `positions.ts`, `sandbox.ts`, `*-frame.ts`, `code*.ts`, `specs.ts`, `symbols.ts`, `moves.ts`, `source-comments.ts`, `diagrams.ts`, `chapters.ts`, `icons.ts`, `fonts.ts` | jsdom in tests |
| `src/background/` | The only holder of GitHub tokens; allowlisted API proxy; restores enabled sites | `worker.ts` | Node in tests |
| `src/popup/` | Enable a self-hosted site; save or remove a GitHub token | `popup.ts`, `popup.html`, `popup.css` | jsdom in tests |
| `src/dev/` | Live reload for `npm run dev` | `reload.ts` | Node in tests |
| `src/testing/` | Test helpers; never shipped | `reader.ts`, `render.ts`, `http.ts`, `indexeddb.ts`, `sandbox.ts` | — |
| `demo/` | The real reader on a sample review; `?spec`, `?comments`, `?large`, `?chapters`, `?code-only`, `?diagram-error` | `main.ts`, `index.html`, `samples/` | Browser |
| `site/` | The website | `index.html`, `styles.css`, `main.js` | Browser |
| `scripts/` | Build, dev server, demo and site servers, store assets, Pages previews, docs check | `build.mjs`, `dev.mjs`, `docs.mjs`, `pages-*.mjs` | Node |
| `e2e/` | Browser checks in Chrome with Puppeteer | `reader.mjs`, `specs.mjs`, `large.mjs`, `files.mjs`, `chapters.mjs`, `site.mjs` | Chrome |

Dependencies point inwards: `core` imports only types from `platforms/types.ts`; `platforms` imports `core`; `ui` imports `core` and `platforms/types.ts`; `content` wires `platforms` and `ui` together. Nothing outside `src/background/` and `src/popup/` imports token storage, and the build enforces it.

## The `ReviewSource` contract

`src/platforms/types.ts` is the seam between platforms and the reader. A platform adapter returns one `ReviewSource` per pull or merge request:

| Member | Purpose |
| --- | --- |
| `title`, `subtitle`, `diffUrl` | What the reader shows, and the way back to the platform |
| `docs`, `codeDocs`, `otherFiles` | Changed Markdown documents, supported source files, and everything else (shown in the chapter map) |
| `load(doc)` | Both versions of one file (`{ base, head }`) |
| `links(doc)` | URLs for raw files and platform pages at the reviewed revision |
| `viewed?` | Native Viewed state, when the platform and authentication support it |
| `prepareComment?(target)` | Where a comment on these lines would go, and how to post it |
| `loadThreads?()` | Existing review threads, each with `reply?()` |
| `overview?` | The request's own title and description |

Errors meant for the reviewer are `ReaderError(message, hint, needsToken)`. A new platform implements this interface; the reader does not change. [RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) proposes a separate repository source alongside it rather than a fabricated review.

## Build outputs

`npm run build` (`scripts/build.mjs`, esbuild) writes:

| Output | Contents |
| --- | --- |
| `dist/chrome/`, `dist/firefox/` | `content.js`, `background.js`, `popup.*`, the three frame pages and scripts, `elk.js`, icons, the manifest with the package version, `THIRD_PARTY_NOTICES.txt` |
| `dist/*.zip` | Store-ready archives with `--zip`; releases also attach a source archive |
| `demo/build/` | The demo bundle and copies of the frames |
| `dist/dev/` | The development build (`npm run dev`): orange icon, DEV badges, source maps, live reload, its own storage |

The build fails if token storage reaches `content.js` or a frame. Our own bundles stay readable; only Mermaid and its layout engine are minified ([ADR 0005](../adr/0005-plain-typescript-and-dom.md)).

## Invariants

Breaking one of these needs a superseding ADR, not a code review exception.

1. No server, telemetry or remote code ([ADR 0002](../adr/0002-no-server-no-telemetry.md)).
2. Every content string reaches the DOM through `sanitize()` or as text ([ADR 0006](../adr/0006-sanitise-all-rendered-html.md)).
3. Third-party engines that read content run only in sandbox frames, and their replies are validated ([ADR 0011](../adr/0011-sandbox-third-party-engines.md)).
4. Tokens never enter the page; the worker makes only allowlisted calls ([ADR 0009](../adr/0009-github-tokens-in-the-background-worker.md)).
5. Repository code is never executed ([ADR 0020](../adr/0020-read-code-statically.md)).
6. Writes to the platform happen once, on an explicit action ([ADR 0008](../adr/0008-comment-through-platform-review-apis.md)).
7. Stored progress is fingerprints only ([ADR 0019](../adr/0019-review-progress-as-fingerprints.md)).
8. Every source file is fully covered by tests ([ADR 0017](../adr/0017-full-coverage-of-every-file.md)).
