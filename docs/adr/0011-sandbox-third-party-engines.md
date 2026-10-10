---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [security, performance]
---

# ADR 0011: Run third-party engines that read pull request content in sandboxed extension frames

## Context

Mermaid draws diagrams and highlight.js colours code; later, Babel's parser reads test files and declarations ([ADR 0020](0020-read-code-statically.md)). All three are large, run on content from the pull request, and were not written with hostile input in mind. Running them in the review page gives them the reviewer's session and DOM. They can also be slow: a Rust file took highlight.js seconds on the main thread, freezing the page.

## Decision

- Mermaid (`diagram-frame`), highlight.js (`highlight-frame`) and the Babel parser (`spec-frame`) run in **sandboxed extension pages**, listed under the manifest's `sandbox` key, loaded into hidden iframes inside the reader's shadow root (`src/ui/sandbox.ts`).
- Each frame has an **opaque origin**, no extension APIs, no storage or cookies, and a content security policy without network access: `sandbox allow-scripts; default-src 'none'; script-src 'self'; style-src 'unsafe-inline'`. Firefox relies on the iframe's `sandbox` attribute and a meta CSP.
- The reader talks to a frame over a `MessageChannel`, **one request at a time**, with a **watchdog** that discards a frame that stops answering.
- **Replies are untrusted.** Frames return structure (highlight markup, declaration ranges, SVG), which the reader validates and sanitises; a reply never supplies replacement source.
- Each frame caps its input: diagrams at 20,000 characters and 300 edges, highlighting at 300,000 characters, test parsing at 200,000 characters.
- Mermaid's palette is passed in as validated hex values; its own external images and icon packs are disabled.

## Consequences

- **Good:** a hostile diagram or grammar cannot reach the page, the session or the network, and cannot freeze the tab.
- **Good:** heavy engines load only when a diagram or code is on screen.
- **Costs:** asynchronous rendering, message validation and per-frame tests; frames are copied into the demo build as well.
- **Costs:** Mermaid is minified and its layout engine (elkjs) is a separate script, to stay within addons.mozilla.org's 5 MB scan limit.

## Alternatives considered

- **Run the engines in the content script:** simpler, but shares the page's renderer, DOM and session.
- **Web workers:** no DOM, which Mermaid needs to measure text; and a worker is not as isolated as a sandboxed opaque origin.

## Enforcement

- `src/ui/sandbox.test.ts`, `diagram-frame.test.ts`, `spec-frame.test.ts` and `highlighting.test.ts` cover message validation, caps and the watchdog.
- `e2e/reader.mjs` checks that the renderer frames live inside the reader's shadow root with `sandbox="allow-scripts"`, and that none is added to the page.
- `npm run build` refuses to bundle token code into any frame ([ADR 0009](0009-github-tokens-in-the-background-worker.md)).

## References

- `6316046` (security review round 2), `c33a240` (the parser frame for test plans and declarations).
- `src/manifest.json` (`sandbox`, `content_security_policy.sandbox`, `web_accessible_resources`).
