---
name: security-boundaries
description: Keep Galley's trust boundaries intact. Use when touching how document, file or comment content is rendered (render.ts, highlighting, diagrams, links, images), the sanitiser, sandbox frames, GitHub tokens or the background worker, platform requests, manifest permissions, storage, or anything that could load a resource or run code; and when reviewing a change for security.
---

# Security boundaries

Galley renders content anyone can write, inside the reviewer's session, next to their token. Read the [security model](../../../docs/architecture/security-model.md) before changing code near a boundary; it lists every boundary, its enforcement and its tests.

## The boundaries, in one line each

1. **Content → DOM:** only through `sanitize()` (`src/ui/render.ts`) or as text nodes. No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` with anything but fixed markup ([ADR 0006](../../../docs/adr/0006-sanitise-all-rendered-html.md)).
2. **Content → Galley's markup:** block ids carry a nonce, classes are allowlisted, content ids get `user-content-`; content must never be able to fake a change mark.
3. **Content → network:** only `<img>`, and external images wait for consent ([ADR 0010](../../../docs/adr/0010-external-images-behind-consent.md)).
4. **Content → engines:** Mermaid, highlight.js and Babel run in sandbox frames; replies are untrusted and validated ([ADR 0011](../../../docs/adr/0011-sandbox-third-party-engines.md)).
5. **Content → execution:** never. Parse, do not run ([ADR 0020](../../../docs/adr/0020-read-code-statically.md)).
6. **Page → token:** tokens live in extension IndexedDB and only the worker uses them, for allowlisted calls ([ADR 0009](../../../docs/adr/0009-github-tokens-in-the-background-worker.md)).
7. **Galley → reviewer's comment:** text Galley adds is posted as code; writes are never retried ([ADR 0008](../../../docs/adr/0008-comment-through-platform-review-apis.md)).
8. **Galley → the world:** no server, telemetry or remote code ([ADR 0002](../../../docs/adr/0002-no-server-no-telemetry.md)).

## Working near a boundary

- **Write the hostile test first.** A document, file name, Mermaid source, comment or API reply that attempts the attack; assert it fails. Put it beside the existing ones (`src/ui/render.test.ts`, `render-edges.test.ts`, `src/core/edges.test.ts`, `src/platforms/comments.test.ts`, `src/background/worker.test.ts`, `src/ui/*-frame.test.ts`).
- **Static HTML needs a reason:** `// biome-ignore lint/plugin: a bundled icon constant.` A reviewer must be able to agree that no content can reach it.
- **New request, permission, storage key or dependency?** Update [PRIVACY.md](../../../PRIVACY.md), the [storage inventory](../../../docs/architecture/storage.md), the store listing if permissions change, and write an ADR for a new boundary. A new permission is at least a `feat`.
- **New GitHub call?** Follow [the how-to](../../../docs/how-to/add-a-github-api-call.md); the worker refuses anything not in `allowedRequest()`.
- **New frame or engine?** Add it to the manifest `sandbox` pages and `web_accessible_resources`, cap its input, validate its replies, and make sure `npm run build`'s token-isolation check covers it.
- **Size limits:** anything proportional to input size needs a cap or a time budget (`src/core/limits.ts`), degrading to a coarser but correct result.

## Reviewing for security

Look for, in order: string-to-HTML sinks; content reaching URLs (`href`, `src`, `srcset`, CSS `url()`, SVG `href`); `eval`, `Function`, dynamic `import()`; token code reachable from `src/content/` or `src/ui/`; requests outside the platform origin; retries around writes; unbounded loops or regexes over content; new storage of readable paths, addresses or content. Report vulnerabilities privately per [SECURITY.md](../../../SECURITY.md), never in a public issue.
