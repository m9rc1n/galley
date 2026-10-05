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

Node 22.6 or newer is required (the tests run TypeScript directly). See "Develop in your own Chrome" in the [README](README.md#develop-in-your-own-chrome) for the dev loop.

## Before you open a pull request

```bash
npm test           # unit tests
npm run typecheck  # TypeScript
npm run build      # both browser builds
```

CI runs the same three. If you change what the reader looks like, include a screenshot; `npm run store-assets` redraws the store graphics from the real reader.

## Guidelines

- **Keep it small and dependency-light.** The extension ships as one script; new runtime dependencies need a good reason, and their licence must be MIT-compatible (the build lists them in `THIRD_PARTY_NOTICES.txt`).
- **Never trust document content.** Pull requests come from forks. Everything rendered goes through DOMPurify; don't add paths around it.
- **Tests for logic, screenshots for looks.** Diffing, parsing and URL handling live in `src/core` and `src/platforms` and are unit-tested. UI changes are checked in the demo.
- **No tracking, no remote code.** Both are promises in the privacy policy and the store listing.
- **Match the surrounding code.** TypeScript, no framework, plain DOM.

## Good first areas

The README roadmap lists what is planned. Rendering gaps are the easiest place to start: math, Mermaid diagrams, `[[_TOC_]]`, and linking `#123` / `@user` references.

## Reporting bugs

Open an issue with the page type (GitHub or GitLab, cloud or self-hosted), what you expected, and what happened. A public pull request or merge request that shows the problem helps most. Please don't paste private repository content or tokens.

For security problems, see [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
