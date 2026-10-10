---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [privacy, rendering]
---

# ADR 0010: Hold images hosted elsewhere until the reviewer chooses to load them

## Context

A document can embed an image from any host. Loading it tells that host the reader's IP address and when they read, which turns a pull request into a tracking pixel. Images on the review site itself reveal nothing new, and most screenshots in documents live there.

## Decision

- Images hosted on the GitHub or GitLab site under review (and GitHub's user-content hosts) load normally (`isPlatformUrl()` in `src/ui/render.ts`).
- Any other absolute image URL is parked by the sanitiser in `data-mr-src` and shown as a placeholder naming its host, with a **Load** button.
- **Settings → Review → External images** offers **Ask** (the default) or **Load**.
- Galley never sends the address of the page being read with these requests.
- Nothing else in a document can fetch: `srcset`, media elements, CSS backgrounds and external SVG references are removed ([ADR 0006](0006-sanitise-all-rendered-html.md)).

## Consequences

- **Good:** reading a review leaks nothing to third parties by default. The privacy policy can say so plainly.
- **Costs:** documents with external diagrams or badges need a click per image, or the **Load** setting.

## Alternatives considered

- **Proxy images through a server:** hides the IP but needs a server ([ADR 0002](0002-no-server-no-telemetry.md)).
- **Block external images entirely:** simpler, but some documents depend on them.

## Enforcement

- `src/ui/render.test.ts` and `src/ui/reader.test.ts` cover held images, the Load button and the setting.
- [PRIVACY.md, Content from other websites](../../PRIVACY.md#content-from-other-websites) describes the behaviour; a change to it is a privacy change.

## References

- `a20bac7` (0.3.1, "External images wait behind a Load button").
