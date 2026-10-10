---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [ui, architecture]
---

# ADR 0004: Show the reader as a full-window shadow-DOM overlay on the review page

## Context

The reader needs the reviewer's session on GitHub or GitLab (cookies, CSRF tokens, same-origin raw files) and should feel like part of the review, one keystroke away from the platform's own page. It also must not be restyled by the platform's CSS, nor restyle it, and both platforms are single-page apps that rebuild their DOM as you navigate.

## Decision

- The content script (`src/content/main.ts`) adds a floating **Read** button, the *launcher* (`src/ui/launcher.ts`), on pull and merge request pages, and re-detects the page on in-app navigation.
- **Read** opens the reader (`src/ui/reader.ts`): one host element, `#galley-reader`, with an open shadow root, covering the window (`position: fixed; inset: 0`, z-index `2147483600`) as a modal dialog (`role="dialog"`, `aria-modal="true"`). `:host { all: initial; }` resets inherited styles, and the whole stylesheet (`src/ui/reader.css`) lives inside the shadow root.
- The reader takes over page scrolling while open and gives back focus and overflow when it closes. <kbd>Esc</kbd> closes the innermost layer first and finally the reader; an unsent comment keeps it open.
- Fonts are registered on the document with unique names (`Galley Newsreader`, `Galley DM Sans`), because `@font-face` rules inside a shadow root are not portable (`src/ui/fonts.ts`).
- The demo (`demo/main.ts`) opens the same reader over a sample review, so everything the reader does can be tried without the extension.

## Consequences

- **Good:** no style collisions in either direction; the platform page is untouched underneath and reappears on close.
- **Good:** requests go out as the page itself, with the reviewer's session ([ADR 0002](0002-no-server-no-telemetry.md)).
- **Costs:** the reader is a modal layer; reviewers return to the platform to approve or resolve threads.
- **Costs:** shadow DOM complicates selection, focus and event retargeting (see the touch-target fixes in 0.6.1). Browser checks cover what jsdom cannot.
- **Costs:** page-level selectors in tests and browser checks go through `document.querySelector('#galley-reader').shadowRoot`.

## Alternatives considered

- **An extension page or new tab:** loses the platform session and the sense of staying in the review.
- **Injecting into the platform's DOM:** breaks whenever GitHub or GitLab changes their markup, and shares their CSS.
- **An iframe:** isolates styles but separates the reader from the page's origin and complicates selection, focus and sizing.

## Enforcement

- `e2e/reader.mjs` drives the real shadow-DOM reader in Chrome: focus return, the sticky top bar, selection inside the shadow root, and <kbd>Esc</kbd> order.
- `src/ui/reader*.test.ts` exercise the public interface in jsdom through the harness in `src/testing/reader.ts`.

## References

- `e941109` (0.1.0); `a003050` added continuous reading and platform comments; `4f6c319` fixed touch targets lost to shadow-DOM event retargeting.
- [The UI map](../design/ui-map.md) names every surface of the reader.
