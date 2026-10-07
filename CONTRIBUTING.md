# Contributing to Galley

Thanks for helping. Galley is small, so the process is too.

## Set up

```bash
git clone https://github.com/m9rc1n/galley.git
cd galley
npm install
npm run dev        # dev build in dist/dev with live reload; load it once via chrome://extensions → Load unpacked
npm run demo       # or: try the reader on a sample merge request, no extension needed
```

Node 22.12 or newer is required (22.12+, 24 or 26+). See "Develop in your own Chrome" in the [README](README.md#develop-in-your-own-chrome) for the dev loop.

## Before you open a pull request

```bash
npm run check      # typecheck, lint and unit tests
npm run build      # both browser builds
npm run test:e2e   # browser checks; needed for anything that changes how the reader looks or behaves
```

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
- **Coverage thresholds** in `vitest.config.ts` enforce overall floors of 95% lines, 92% statements, 90% functions and 80% branches, plus separate thresholds per folder. When you add tests, raise the numbers. The reader tests exercise its public interface and DOM events with real document rendering: review navigation, settings, comment targeting and submission, viewed progress, and image consent. Browser checks still verify real layout and selection behavior that jsdom cannot model.
- `npm run test:coverage` produces an HTML report at `coverage/index.html` locally, plus `coverage-summary.json` and `lcov.info` both locally and in CI. `node scripts/coverage-summary.mjs` prints a folder summary. Production source stays in the denominator; only test files, test helpers and type declarations are excluded.
- Coverage reports are retained when tests fail, and the test command still fails. CI prints the folder summary only when its report exists and uploads to Codecov only after a successful run; failed-run reports remain available as diagnostic artifacts.

**Browser checks** (`e2e/reader.mjs`) drive the real reader in Chrome against the demo page: layout at several widths, selection, focus, the sticky bar, comments. `npm run test:e2e` builds the demo, serves it and runs them; screenshots land in `reports/e2e/`.

**Lint** is [Biome](https://biomejs.dev) (`npm run lint`), configured in `biome.jsonc` with its recommended rules plus `noFloatingPromises`; formatting is deliberately not enforced. One rule is custom (`lint/no-unsanitized-html.grit`): writing a string as HTML (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) is an error, because this extension renders content from pull requests. Document text must go through the sanitiser in `src/ui/render.ts` or be built from DOM nodes. A static template is fine if you say why:

```ts
// biome-ignore lint/plugin: a bundled icon constant.
button.innerHTML = icons.comment;
```

Suppressions need a reason after the colon, and a reviewer should be able to agree with it.

## Guidelines

- **Keep it small and dependency-light.** The reader ships as one script with a separate lazy-loaded Mermaid engine; new runtime dependencies need a good reason, and their licence must be MIT-compatible (the build lists them in `THIRD_PARTY_NOTICES.txt`).
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

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
