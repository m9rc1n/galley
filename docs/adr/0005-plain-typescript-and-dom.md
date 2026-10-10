---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [ui, dependencies]
---

# ADR 0005: Write the extension in plain TypeScript and DOM, with few, permissively licensed dependencies

## Context

Galley ships as a content script into every pull request page, and store reviewers at Chrome Web Store and addons.mozilla.org read the bundles. Every runtime dependency adds bytes to each page, a supply-chain risk, a licence to track and code a reviewer must trust. The UI is one overlay with a known set of surfaces, not an application with routing and shared state across many screens.

## Decision

- Source is **TypeScript with no UI framework**: the reader builds its DOM with `document.createElement`, small helpers (`h()` in `src/ui/reader.ts`) and static templates of fixed markup. State lives on the `Reader` instance; settings in `src/ui/settings.ts`.
- **Runtime dependencies stay few** and each has a job no small module could do: `markdown-it` (and its emoji and footnote plugins), `diff`, `dompurify`, `highlight.js`, `mermaid` and `@babel/parser`. Mermaid, highlight.js and Babel run only inside sandboxed frames ([ADR 0011](0011-sandbox-third-party-engines.md)).
- **New runtime dependencies need a good reason and a permissive licence** (MIT, BSD, ISC or Apache-2.0), so the project stays compatible with the GPL and the commercial licence ([ADR 0016](0016-gpl-with-commercial-licence.md)). The build writes `THIRD_PARTY_NOTICES.txt` from what it bundles.
- **Bundles stay readable.** esbuild folds constants (`minifySyntax`) but keeps names and whitespace, except Mermaid and its layout engine, which are minified to fit addons.mozilla.org's 5 MB scan limit.

## Consequences

- **Good:** small, auditable bundles; no framework upgrades; store reviews go smoothly; nothing between the code and the DOM when debugging layout.
- **Costs:** `reader.ts` is large (about 3,000 lines) and does its own event delegation (`data-act` attributes), focus management and layout scheduling. New surfaces follow its patterns rather than a framework's.
- **Costs:** contributors used to components must learn those patterns; [the UI map](../design/ui-map.md) and [patterns](../design/patterns.md) document them.

## Alternatives considered

- **React, Preact, Svelte or Lit:** familiar component models, but a runtime in every page, a build plugin, and a second rendering path that would have to respect the sanitiser ([ADR 0006](0006-sanitise-all-rendered-html.md)).
- **Web components for each surface:** native, but the whole reader already lives in one shadow root; more roots would complicate focus, selection and styling.

## Enforcement

- [CONTRIBUTING.md, Guidelines](../../CONTRIBUTING.md#guidelines): "TypeScript, no framework, plain DOM" and the licence rule for dependencies.
- `npm run build` fails if token storage is bundled into page-facing scripts; the CI **Build** job checks that release bundles carry no development-only code.
- Reviewers question every new entry under `dependencies` in `package.json`.

## References

- `e941109` (0.1.0); `925402c` added the permissive-licence rule; `scripts/build.mjs` documents the minification exception.
