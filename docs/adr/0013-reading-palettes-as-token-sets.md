---
status: Accepted
date: 2026-10-06
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [ui, design-system, accessibility]
---

# ADR 0013: Define reading palettes as sets of colour tokens, separate from light and dark, with tested contrast floors

## Context

Reviewers read for a long time, on different screens, at different hours, and some need high contrast or a tinted page. Galley grew from one theme to four palettes, then twelve, then nineteen. Early on a theme mixed two choices, colour and brightness, so "Sepia" could not be dark. Change colours were tuned for one palette and clashed with others, and "edited" and "removed" were once both brown.

## Decision

- **Two independent settings.** *Appearance* is System, Light or Dark; *Palette* is one of the nineteen in `THEMES` (`src/ui/settings.ts`). Every palette has a light and a dark version, and saved choices from the older single setting are migrated.
- **Palettes are token sets.** A palette defines the same CSS custom properties on `.mr-root` (`--bg`, `--fg`, `--muted`, `--soft`, `--rule`, `--code-bg`, `--accent`, the change tokens `--add*`, `--mod`, `--del*`, `--ins-band`, `--gutter-*`, `--code-add`, `--code-del`, and syntax tokens `--hl-*`). Everything else in `src/ui/reader.css` is written against tokens, never raw colours. Shared defaults and the dark change colours are defined once; a palette overrides what it needs.
- **Change colours keep their meaning everywhere:** green for added, amber for edited, rose for removed, each re-tinted to sit on its palette's page. Moved code uses a tint of the accent instead.
- **Surface hierarchy:** page, code, cards, then controls, each distinguishable; the accent is reserved for focus and selection.
- **Contrast floors are tested in every palette and appearance:** body text at least 7:1 against the page; muted text, every syntax colour on every code background, change text on its own background, and the comment placeholder at least 4.5:1; the accent and the margin markers at least 3:1. In dark appearances, cards, controls and code must stand apart from the page, and control borders and focus rings reach 3:1 on cards.
- Palette cards in the settings preview the real page in the current appearance, using the same tokens.

## Consequences

- **Good:** a new palette is a block of token values plus a test run; components never need per-palette rules.
- **Good:** accessibility is a build failure, not a review comment.
- **Costs:** every palette needs light and dark values for all tokens that differ from the defaults, tuned until the checks pass.

## Alternatives considered

- **One theme setting covering colour and brightness:** the original design; it doubled the choices and blocked dark versions of warm palettes.
- **Generate palettes from one accent colour:** less work, but change colours and syntax colours need hand tuning to meet the floors on tinted pages.

## Enforcement

- `e2e/reader.mjs` measures every palette in light and dark, writes `reports/e2e/contrast.json`, and fails on any sample under its minimum. It also checks that every palette has a distinct background in each appearance.
- [Design foundations](../design/foundations.md#colour) lists the tokens; [How to add a palette](../how-to/add-a-palette.md) walks through the checks.

## References

- `e68da5a` (palettes separated from appearance), `60f2890` (per-palette change colours), pull requests [#23](https://github.com/m9rc1n/galley/pull/23) and [#34](https://github.com/m9rc1n/galley/pull/34) (twelve, then nineteen palettes).
