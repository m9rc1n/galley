# Accessibility

Galley's reason to exist is reading comfort, so accessibility is not a separate pass: it is the product. This is the bar every change meets, and where each part of it is checked.

## The bar

| Area | Requirement | Checked by |
| --- | --- | --- |
| Text contrast | Body text 7:1 against the page (WCAG AAA); muted and interface text 4.5:1 | `e2e/reader.mjs`, every palette, light and dark |
| Code contrast | Every syntax colour 4.5:1 on code, added, removed and moved backgrounds | `e2e/reader.mjs` |
| Change colours | Added and removed text 4.5:1 on their highlights; margin markers and the accent 3:1 on the page | `e2e/reader.mjs` |
| Non-text contrast | Editable field borders and focus rings 3:1 on cards; cards, controls and code distinguishable from the page in dark | `e2e/reader.mjs` |
| Colour independence | Every change has a second cue: strike line, word, label or position | Review |
| Keyboard | Every action reachable without a pointer; documented shortcuts; visible focus (`:focus-visible`, 2px accent outline) | `e2e/reader.mjs`, unit tests |
| Focus order | Focus moves into a layer when it opens and back when it closes; <kbd>Tab</kbd> stays inside the current layer | `e2e/reader.mjs`, `e2e/chapters.mjs` |
| Names and roles | Icon buttons have `aria-label`; toggles expose `aria-pressed`, `aria-checked` or `aria-expanded`; dialogs have `role="dialog"`, `aria-modal` and a label | Unit tests, `e2e/chapters.mjs` (accessibility tree) |
| Announcements | Results and progress use `role="status"` or `aria-live="polite"`: toast, Viewed feedback, change counter, text size | Review |
| Touch | Targets at least 44 pixels on phones and `(hover: none)` screens; no hover-only action | `e2e/reader.mjs` (editor submit button, touch comment targets) |
| Small screens | Usable at 320 pixels wide; no horizontal page scroll; code wraps instead of scrolling | `e2e/reader.mjs` at 390 and 320 pixels |
| Zoom and text size | Five text sizes; titles, bylines, contents and comments scale with them | `e2e/reader.mjs` |
| Motion | `prefers-reduced-motion` removes transitions and stills the top glow | Browser checks run with reduced motion |
| Language | Word diffs use `Intl.Segmenter`, so CJK and other scripts split correctly | `src/core/worddiff.test.ts` |

## Reading comfort features

These exist for readers with different needs and should keep working with every new feature:

- **Palettes** for different sensitivities: Contrast (crisp ink), Cream (the tone dyslexia style guides recommend), E-ink, Night (warm amber for evenings), and dark versions of all nineteen.
- **Typefaces**, including the reader's system font and monospace.
- **Text sizes** from 17 to 24 pixels, and **Compact** or **Comfortable** density.
- **Layouts** that trade comments for text width (Focus, Wide text) or the reverse (Review).
- **Clean mode** to read the new version without marks.
- **Code that wraps** under its own indentation, so nothing needs sideways scrolling.

## Writing accessible UI in Galley

- Build with real elements: `button` for actions, `a[href]` for navigation, native `select`. Avoid `div` with click handlers.
- Give every new control its accessible name in the same change; prefer visible text, and add `aria-label` where the visible text needs context ("Show changes in docs/guide.md").
- Put state in ARIA, not only in classes: `aria-pressed` for choices, `aria-checked` with `role="switch"` for on/off, `aria-expanded` for disclosures and menus, `aria-current` for the current file.
- Decorative icons and dots get `aria-hidden="true"`.
- Hidden means hidden: use the `hidden` attribute or `inert`, so assistive technology and focus skip it too.
- Test with the keyboard first, then on a phone width, then in dark Contrast.

## Known gaps

- Mermaid diagrams are images to assistive technology; **View source** gives the Mermaid text.
- Platform-specific syntax (`[[_TOC_]]`, math, PlantUML) renders as text or code.
- No automated screen reader run; the accessibility tree is checked for names in `e2e/chapters.mjs` only.

Report accessibility barriers as issues; they are bugs.
