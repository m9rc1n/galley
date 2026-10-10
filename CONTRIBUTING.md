# Contributing to Galley

Thanks for helping. Galley is small, so the process is too.

## Set up

```bash
git clone https://github.com/m9rc1n/galley.git
cd galley
npm install        # also turns on the pre-push hook (.githooks/pre-push)
npm run dev        # dev build in dist/dev with live reload; load it once via chrome://extensions → Load unpacked
npm run demo       # or: try the reader on a sample merge request, no extension needed
```

Node 22.12 or newer is required (22.12+, 24 or 26+). See [Develop in your own Chrome](#develop-in-your-own-chrome) for the dev loop.

## Develop in your own Chrome

```bash
npm install
npm run dev
```

Then, once: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose `dist/dev`.

- The dev build is called **Galley (dev)**. It has an orange icon and DEV badges, so it can sit next to the store version; turn the store version off while you develop.
- Leave `npm run dev` running. Every save rebuilds: content script changes appear in the active GitHub or GitLab tab within a couple of seconds, popup changes the next time you open the popup, and manifest or dev-worker changes need one click on the reload icon of Galley (dev) in `chrome://extensions`.
- Source maps are included, so DevTools shows the TypeScript sources.
- The dev build keeps its own settings and GitHub token, separate from the store version.
- `npm run dev:zip` makes a dev build with the same name and badges that works without `npm run dev` (no live reload), plus a zip of it.

To load a plain build instead: `npm run build`, then **Load unpacked** on `dist/chrome` (Chrome, Edge, Brave, Arc), or in Firefox open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and pick `dist/firefox/manifest.json`. `npm run zip` writes store-ready archives to `dist/`.

## Commands

```bash
npm run dev           # dev build in dist/dev with live reload (see above)
npm run dev:zip       # one-off dev build that works without the dev server (dist/dev-standalone + zip)
npm run demo          # build and serve the demo on http://localhost:4173
npm run site          # build and serve the website, with the demo, on http://localhost:4185
npm test              # unit tests (Vitest), one project per folder
npm run test:watch    # unit tests, re-running as you edit
npm run test:coverage # unit tests with coverage, which must be 100% in every file
npm run test:e2e      # builds the demo and runs the reader's browser checks (Chrome; CHROME_PATH supported)
npm run test:site     # browser checks for the built website
npm run test:pages    # preview lifecycle, file isolation and publisher checks
npm run screenshots   # screenshots of the reader in the demo at several widths, light and dark (needs Chrome)
npm run docs:check    # ADR and RFC records, generated indexes, relative links and anchors in every Markdown file
npm run docs:index    # regenerate the ADR and RFC indexes
npm run lint          # Biome; npm run lint:fix applies the safe fixes
npm run format        # Biome formatter; npm run format:check only reports
npm run typecheck     # TypeScript, no emit
npm run check         # typecheck, lint, formatting, tests with coverage, Pages preview checks and the docs check
npm run icons         # redraw the toolbar icons
npm run store-assets  # real reader captures, store screenshots and artwork (needs Chrome)
npm run artwork       # preview the artwork and the README on http://localhost:4180
npm run release       # checks, store-ready zips, privacy page
```

## How Galley works

1. A content script recognises pull and merge request pages, including in-app navigation, and lists the changed documents and supported source files through the platform's REST API.
2. It loads both versions of each document, and of each source file when code files are on.
   - GitLab: the raw files at the merge base and at the head commit.
   - GitHub: the head file through the same-origin raw URL. The base version is rebuilt by reversing the pull request's patch, and fetched at the merge base only when GitHub omits the patch.
3. Both versions are parsed with markdown-it (GFM tables, task lists, footnotes, alerts, front matter). Every leaf block (paragraph, list item, heading, table, code block) remembers its source lines.
4. A block diff matches the two documents. Prose is compared by whitespace-normalised text plus its resolved link and image destinations; code and raw HTML are compared exactly. Edited blocks are paired by word similarity, and inside a pair a word diff marks what changed, using `Intl.Segmenter` tokens and a clean-up pass so rewrites read as phrases rather than confetti. Every diff has a work limit, so hostile input degrades to "replaced" instead of freezing the tab.
5. The result is sanitised with DOMPurify and shown in a shadow-DOM overlay, so the page's styles and the reader's never mix. Mermaid and highlight.js run in sandboxed extension frames.

| Path | What it is |
| --- | --- |
| `src/content/main.ts` | Content script: page detection, the Read button, single-page navigation |
| `src/platforms/` | GitHub and GitLab adapters, page detection, fetch helpers, token storage |
| `src/core/` | Markdown parsing into blocks, block diff, word diff, DOM highlighting, patch reversal |
| `src/ui/` | The reader overlay, its stylesheet, rendering pipeline, settings, sandboxed renderers |
| `src/popup/` | Toolbar popup: enable self-hosted sites, GitHub token |
| `src/background/` | Background worker: holds the GitHub token and makes the token-bearing API calls |
| `demo/` | Sample merge request for trying the reader without the extension |
| `site/` | The website ([site/README.md](site/README.md)) |
| `store/` | Store listing copy, artwork templates and generated assets ([store/ARTWORK.md](store/ARTWORK.md)) |
| `src/testing/` | Helpers shared by the unit tests (never shipped) |
| `e2e/` | Browser checks of the reader and the website, run in Chrome |
| `lint/` | Custom lint rules for [Biome](https://biomejs.dev) |
| `docs/` | Documentation: guide, architecture, design, decisions, proposals, how-tos ([docs/README.md](docs/README.md)) |
| `.claude/skills/` | Skills for coding agents ([AGENTS.md](AGENTS.md)); `.agents/skills` links to the same folder |

## Documentation, decisions and proposals

[docs/README.md](docs/README.md) is the map. The parts contributors use most:

- [Architecture](docs/architecture/README.md), the [security model](docs/architecture/security-model.md) and the [storage inventory](docs/architecture/storage.md): how the pieces fit and which boundaries must hold.
- [Design](docs/design/README.md): principles, tokens, the [UI map](docs/design/ui-map.md) of every surface, interaction patterns and the accessibility bar.
- [How-to guides](docs/how-to/README.md): adding a setting, a palette, a shortcut or a GitHub API call, and verifying a UI change (`npm run screenshots`).
- [Architecture decision records](docs/adr/README.md): read the ones for the area you are changing. A change that contradicts one comes with a new ADR that supersedes it.
- [RFCs](docs/rfcs/README.md): new surfaces, new stored data, new permissions and multi-step work start as an RFC, numbered after the issue that hosts its discussion.

ADRs and RFCs link to each other in their front matter, and their indexes are generated: run `npm run docs:index` after adding one. `npm run docs:check` (part of `npm run check`) fails on broken relative links or anchors, stale indexes and one-way links.

Coding agents start at [AGENTS.md](AGENTS.md), which points them to the same documents and to the skills in `.claude/skills/`.

## Before you open a pull request

```bash
npm run check      # typecheck, lint, formatting, and unit tests with the coverage thresholds
npm run build      # both browser builds
npm run test:e2e   # browser checks; needed for anything that changes how the reader looks or behaves
```

`git push` runs `npm run check` first, on each commit being pushed, in a temporary worktree, so uncommitted and untracked files don't count; a failure stops the push. `npm install` turns the hook on by setting `core.hooksPath` to `.githooks` (if you install with `--ignore-scripts`, run `npm run prepare` once). To skip it for one push, use `git push --no-verify`. `npm run format` fixes formatting.

CI runs all of these, on Node 22 and 24, and fails if test coverage drops. `test:e2e` needs Chrome; set `CHROME_PATH` if it is installed somewhere unusual. If you change what the reader looks like, include a screenshot; `npm run store-assets` redraws the store graphics from the real reader.

## Commits and releases

Galley follows [Semantic Versioning](https://semver.org), and the version is never edited by hand. It is worked out from [Conventional Commits](https://www.conventionalcommits.org) by [release-please](https://github.com/googleapis/release-please).

Pull requests are squash-merged, so **the pull request title is the commit message** and has to look like `type(scope): summary`. A check on every pull request enforces it.

| Title | Effect on the version | Appears in the changelog |
| --- | --- | --- |
| `fix: …` | patch (0.3.1 → 0.3.2) | Bug Fixes |
| `perf: …`, `revert: …` | patch | Performance, Reverts |
| `feat: …` | minor (0.3.1 → 0.4.0) | Features |
| `feat!: …` or a `BREAKING CHANGE:` footer | minor while below 1.0, major after | Features, marked breaking |
| `docs:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:`, `style:` | none: they never open a release on their own | hidden |

Choose the type by what a user of the extension would notice: new capability is `feat`, a correction is `fix`, and changes nobody using the extension would see (docs, tests, tooling, internal cleanup) use a hidden type so they do not trigger a Web Store upload. Asking for a new browser permission is at least a `feat`, because Chrome disables the extension until the user accepts it.

How a release happens:

1. After each merge to `main`, release-please opens or updates one pull request, `chore(main): release X.Y.Z`. It raises the version in `package.json` and `package-lock.json` and adds the new entries to `CHANGELOG.md`. The build copies the version into the extension manifest, so there is nothing else to edit.
2. Merging that pull request is the release. It creates the `vX.Y.Z` tag and GitHub release, and [`release.yml`](.github/workflows/release.yml) builds the Chrome and Firefox zips and attaches them with checksums and a build provenance attestation.
3. Upload the Chrome zip to the Web Store ([PUBLISHING.md](PUBLISHING.md#updates)).

To force a particular version, put `Release-As: 0.5.0` as a footer in a commit message. Nothing is released until the release pull request is merged, so you can leave it open to batch several changes.

## Tests and lint

**Unit tests** use [Vitest](https://vitest.dev) and sit next to the code they cover: `src/core/markdown.ts` is tested by `src/core/markdown.test.ts`. Each folder is its own Vitest project (`core`, `platforms`, `background`, `ui`, `content`, `popup`, `dev`), so a layer can be run alone and the report is grouped by folder:

```bash
npm test                          # everything, once
npm run test:watch                # re-run on every save
npx vitest run --project core     # one folder
npx vitest run src/ui/render      # files matching a name
npm run test:coverage             # coverage report in coverage/, and the thresholds
```

- Tests in `core`, `platforms`, `background` and `dev` run in Node. `ui`, `content` and `popup` tests run in jsdom; any other file that needs a DOM starts with `// @vitest-environment jsdom`.
- `src/testing/` holds what tests share: `renderMarkdown` (render two versions of a document), `mockFetch` and `jsonResponse`, an in-memory IndexedDB for the GitHub token store, and a reader harness that supplies browser geometry for jsdom. It is never part of a build.
- `fetch`, globals and storage are restored after every test, so tests cannot leak into each other. Stub with `vi.stubGlobal` and `vi.spyOn`, or `mockFetch`; don't assign globals by hand.
- Write the test for the behaviour a reviewer would notice, and say it in the title: *"raw HTML cannot borrow a block id to hide a real edit"*, not *"test sanitize"*. For a bug fix, write the test that fails first.
- **Coverage is 100%**: `vitest.config.ts` requires every source file to have all its statements, branches, functions and lines covered. If a branch cannot be reached, it is dead code: delete it (or the guard around it) instead of skipping it, and let the type system or a comment carry the reason it cannot happen. Code that depends on a build-time constant, such as the development build's marks, is tested in a `*.dev.test.ts` file, which runs in its own project built with `__GALLEY_DEV__` on. The reader tests exercise its public interface and DOM events with real document rendering: review navigation, settings, comment targeting and submission, viewed progress, and image consent. Browser checks still verify real layout and selection behavior that jsdom cannot model.
- `npm run test:coverage` produces an HTML report at `coverage/index.html` locally, plus `coverage-summary.json` and `lcov.info` both locally and in CI. `node scripts/coverage-summary.mjs` prints a folder summary. Production source stays in the denominator; only test files, test helpers and type declarations are excluded.
- Coverage reports are retained when tests fail, and the test command still fails. CI prints the folder summary only when its report exists and uploads to Codecov only after a successful run; failed-run reports remain available as diagnostic artifacts.

**Browser checks** (`e2e/reader.mjs`) drive the real reader in Chrome against the demo page: layout at several widths, selection, focus, the sticky bar, comments. `npm run test:e2e` builds the demo, serves it and runs them; screenshots land in `reports/e2e/`.

**Lint and formatting** use [Biome](https://biomejs.dev), configured in `biome.jsonc`: the recommended lint rules plus `noFloatingPromises` (`npm run lint`), and the formatter with 160-character lines (`npm run format` rewrites files, `npm run format:check` only reports). CI and the pre-push hook fail on unformatted files; editors with the Biome extension can format on save. One rule is custom (`lint/no-unsanitized-html.grit`): writing a string as HTML (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) is an error, because this extension renders content from pull requests. Document text must go through the sanitiser in `src/ui/render.ts` or be built from DOM nodes. A static template is fine if you say why:

```ts
// biome-ignore lint/plugin: a bundled icon constant.
button.innerHTML = icons.comment;
```

Suppressions need a reason after the colon, and a reviewer should be able to agree with it.

## Guidelines

- **Keep product language clear and friendly.** Follow [docs/COPY.md](docs/COPY.md): explain how Galley helps teams understand changes, use the reader's actual control labels, and keep humor light.
- **Keep it small and dependency-light.** The reader ships as one script with a separate lazy-loaded Mermaid engine; new runtime dependencies need a good reason, and their licence must be permissive (MIT, BSD, ISC, Apache-2.0). That keeps them compatible with the GPL and leaves room for the commercial licence described under [Licence](#licence). The build lists them in `THIRD_PARTY_NOTICES.txt`.
- **Never trust document content.** Pull requests come from forks. Everything rendered goes through DOMPurify; don't add paths around it.
- **Tests for logic, screenshots for looks.** Diffing, parsing, URL handling and the token worker live in `src/core`, `src/platforms` and `src/background` and are unit-tested. UI changes are checked in the demo and by `npm run test:e2e`.
- **No tracking, no remote code.** Both are promises in the privacy policy and the store listing.
- **Match the surrounding code.** TypeScript, no framework, plain DOM.

## Good first areas

The README roadmap lists what is planned. Rendering gaps are the easiest place to start: math, `[[_TOC_]]`, and linking `#123` / `@user` references.

## Reporting bugs

Open an issue with the page type (GitHub or GitLab, cloud or self-hosted), what you expected, and what happened. A public pull request or merge request that shows the problem helps most. Please don't paste private repository content or tokens.

For security problems, see [SECURITY.md](SECURITY.md).

## Licence

Galley is licensed under the [GNU General Public License, version 3 or later](LICENSE), and Marcin Urbanski also offers it under a commercial licence (see the README). By contributing you agree that:

- your contribution is licensed under the GPL, version 3 or later; and
- you grant the maintainer a perpetual, worldwide, non-exclusive, royalty-free, irrevocable licence to use, modify, sublicense and relicense your contribution, including under commercial terms. You keep your copyright. This clause exists so the commercial licence can cover the whole project, and for no other purpose.

Only contribute code you wrote or have the right to submit on these terms.
