---
name: verify-ui
description: See and check Galley's reader in a real browser. Use after changing what the reader, popup or website looks like or how it behaves, when a browser check (npm run test:e2e) fails, or when asked for screenshots of the UI at different widths, palettes or appearances.
---

# Verify a UI change

Unit tests run in jsdom, which has no layout. Anything visual needs a real browser, and you need to look at the result.

## 1. Screenshots

```bash
npm run screenshots                                   # 1440, 1100, 390 px; light and dark; Sage; plus the settings sheet
npm run screenshots -- --widths 1440,390 --palettes sage,contrast,sepia --appearances light,dark
npm run screenshots -- --demo large --code            # folded files, moved code, declarations, with code files on
npm run screenshots -- --demo chapters --scroll 600   # scroll the reader before capturing
npm run screenshots -- --help                         # every option: layout, density, size, clean mode, scale
```

PNGs land in `reports/screenshots/`, named `<demo>-<palette>-<appearance>-<width>.png`. **Open and look at every one** (an agent can read PNGs with its file-reading tool). If Chrome is not found, set `CHROME_PATH` (in Claude Code cloud sessions: `/opt/pw-browsers/chromium`).

Demo variants: `default` (two documents and a source file, with threads), `large`, `spec`, `comments`, `chapters`, `code-only`, `diagram-error`.

## 2. What to look for

Use the [design checklist](../../../docs/design/README.md#review-checklist). In particular:

- Text centred with even margins at 1,440; one column at 1,100; nothing past the right edge at 390.
- Change marks readable and distinct; comment cards level with their text; nothing overlapping the top bar.
- Dark appearance: cards, code and controls distinct from the page; no washed-out accent.
- Focus visible; the settings sheet fits; touch targets look tappable on the phone width.
- Page errors printed by the script mean something broke: fix them.

## 3. Browser checks

```bash
npm run test:e2e      # builds, then e2e/reader.mjs (with specs, large, files, chapters): layout at many widths,
                      # focus, selection, comments, diagrams, contrast in all 19 palettes light and dark
npm run test:site     # the website and the demo at a nested path
```

Screenshots from the checks go to `reports/e2e/`; contrast ratios to `reports/e2e/contrast.json`. When a check fails, read the assertion message (it prints the measured values), reproduce with `npm run screenshots` at that width, fix the CSS, and rerun. Never loosen an assertion to make it pass; if the expectation is wrong, say why in the pull request.

## 4. Before and after

For a pull request that changes the look, capture the same states on `main` and on your branch and include both. If the reader looks different in the store images, run `npm run store-assets`.
