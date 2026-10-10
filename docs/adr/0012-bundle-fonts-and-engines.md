---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [privacy, typography]
---

# ADR 0012: Bundle fonts and engines with the extension; load nothing from a CDN or font service

## Context

The reader's typography (Newsreader for titles and quotations, DM Sans for running text and controls) matches the website and is a large part of why reviews read calmly. Fonts from a font service would tell that service when someone reads a review, and could be blocked by a page's `font-src` policy. Store policies also forbid remotely hosted code.

## Decision

- Newsreader (regular and italic) and DM Sans ship as Latin-subset `woff2` files in `src/ui/fonts/`, with their SIL Open Font Licences. esbuild embeds them as binary; `src/ui/fonts.ts` registers them on the document under Galley-specific names (`Galley Newsreader`, `Galley DM Sans`), so a page's own copy cannot replace them and the page's CSP does not apply.
- Mermaid, highlight.js, the Babel parser and every other library are bundled. Nothing is fetched at run time except the review's own files and, with consent, external images ([ADR 0010](0010-external-images-behind-consent.md)).
- The website self-hosts the same font files.

## Consequences

- **Good:** no third-party requests, consistent rendering everywhere, and store reviews pass the remote-code rules.
- **Costs:** a larger package; Latin subsets only, so other scripts fall back to system fonts.

## Alternatives considered

- **Google Fonts or another CDN:** smaller package, but a request per reading session to a third party.
- **System fonts only:** private and small, but loses the reading experience the product is built around.

## Enforcement

- `src/ui/fonts.test.ts`; `e2e/reader.mjs` waits for the three Galley faces to load and asserts the title uses Galley Newsreader.
- The build writes the font licences into `THIRD_PARTY_NOTICES.txt`.

## References

- `99807dc` (reader typography matches the website), release 0.4.0 notes in [CHANGELOG.md](../../CHANGELOG.md).
