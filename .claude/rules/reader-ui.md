---
paths:
  - "src/ui/**"
  - "src/popup/**"
  - "site/**"
  - "store/templates/**"
---

# Working on the interface

- Load the `galley-ui` skill for any change a reviewer would see; `verify-ui` to look at it.
- Colours come from tokens (`docs/design/foundations.md`); change colours mean change, with a second cue.
- New controls follow `docs/design/patterns.md`: `data-act` + `Reader.onClick()`, settings through `update()` → `applySettings()`, state in `aria-pressed` / `aria-checked` / `aria-expanded`.
- Keyboard, 44-pixel touch targets, reduced motion, light and dark, 1,440 and 390 pixels: in the same change.
- Content reaches the DOM only through `sanitize()` or text nodes (ADR 0006). Static markup needs `// biome-ignore lint/plugin: <reason>`.
- Labels and messages follow `docs/COPY.md`; update `docs/GUIDE.md` and the UI map when behaviour or names change.
