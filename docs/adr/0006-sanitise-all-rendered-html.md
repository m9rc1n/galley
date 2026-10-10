---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [security, rendering]
---

# ADR 0006: Treat every document as hostile: sanitise all rendered HTML, and enforce it with a lint rule

## Context

Pull requests come from forks. A document, a comment, a pull request description or a file name can contain HTML written by anyone, and Galley renders it inside the reviewer's GitHub or GitLab session, next to a GitHub token the reviewer may have saved. Beyond running scripts, hostile content could also lie: borrow Galley's own classes to fake a change marker, hide new text as "removed" in Clean mode, or load a tracking pixel.

## Decision

- **One sanitiser.** Every HTML string from content (documents, comments and replies, pull request descriptions) goes through `sanitize()` in `src/ui/render.ts` (DOMPurify) before it reaches the DOM. Forbidden tags include `style`, `form`, `iframe`, `object`, `embed`, `base`, `link`, `meta`, form controls and media; forbidden attributes include `style`, `srcset`, `poster`, `background` and `ping`; `data-*` attributes are dropped except the two Galley renders itself.
- **Content cannot impersonate the reader.** Block ids carry a random per-render nonce (`data-mr-u="<nonce>:<id>"`), so markup cannot claim to be a block. Classes are filtered to the ones Galley's Markdown renderer produces. Document ids and names get the `user-content-` prefix, as on GitHub, so they cannot take over the reader's own ids.
- **Content cannot fetch.** Only `<img>` may load, and an absolute image URL is parked in `data-mr-src` until the reviewer allows it ([ADR 0010](0010-external-images-behind-consent.md)). Relative links are decoded before dot segments are resolved, so an encoded `../` cannot leave the repository (`src/core/paths.ts`). Thread and "View on" links stay on the review site's origin.
- **Comments cannot speak for the reviewer.** The file path and quote Galley adds to a posted comment are sent as code, so content cannot add mentions, references, links or images to the reviewer's comment; quotes are capped at 1,000 characters (`src/platforms/comments.ts`).
- **Everything else is built from DOM nodes or text.** Writing a string as HTML (`innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`) is a lint error. A static template of fixed markup is allowed with a `biome-ignore lint/plugin: <reason>` comment a reviewer can agree with.

## Consequences

- **Good:** one place to audit; a security report can name it (see [SECURITY.md](../../SECURITY.md)).
- **Costs:** some legitimate HTML in documents does not render (inline styles, embedded video, forms). Reviewers can open the platform diff.
- **Costs:** UI code is more verbose than string templates; static templates need a reason.

## Alternatives considered

- **Trust the platform's sanitisation:** Galley does not use the platform's rendered HTML ([ADR 0003](0003-parse-and-compare-markdown-in-the-browser.md)).
- **Escape everything:** safe, but loses the tables, alerts, images and diagrams that make documents readable.
- **Trusted Types:** a good complement, but it does not prevent content from imitating Galley's markers, which is the subtler risk here.

## Enforcement

- `lint/no-unsanitized-html.grit`, a Biome plugin run by `npm run lint` and CI, outside test files.
- Hostile-document regression tests in `src/ui/render.test.ts`, `src/ui/render-edges.test.ts`, `src/core/edges.test.ts` and `src/platforms/comments.test.ts`.
- [Security model](../architecture/security-model.md) and the `security-boundaries` agent skill list what to test when touching rendering.

## References

- `6b4a973` (spoofed markers, data attributes, classes), `a20bac7` (0.3.1, linear HTML checks), `6316046` (security review round 2: comment context as code, link decoding, `user-content-` ids, size caps).
- [CONTRIBUTING.md, Tests and lint](../../CONTRIBUTING.md#tests-and-lint).
