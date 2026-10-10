---
status: Accepted
date: 2026-10-09
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [ui, layout]
---

# ADR 0018: Centre the text on wide screens, with contents and comments in its margins

## Context

The reader shares a wide window between three things: the contents of the current document, the text, and the comments column. Version 0.5.0 laid them out from the left and gave every spare pixel to the comments; 0.6.0 let Balanced grow to 1,680 pixels. On a 16-inch laptop (1,728 pixels) that made a 640-pixel comments column, usually empty, beside text pushed left of centre: a hole rather than a margin. Reading sites centre the text; document editors put comments in the margin.

## Decision

- From **1,280 pixels** wide, the text is **centred** at a comfortable measure (680 pixels in Balanced). The contents hang in the left margin; the comments column fills the right margin **up to 440 pixels** (`--rail-max`).
- The text moves left of centre only when the comments column would otherwise get **less than 360 pixels** (`--rail-min`). On very wide windows the margins grow evenly; text size does not.
- Each **layout** (Balanced, Files, Review, Wide text, Focus, Fit to screen) sets the same few custom properties (`--measure-max`, `--toc-width`, `--rail-min`, `--rail-max`, `--shift`), and one set of wide-screen rules shares the window out from them. Review centres the whole composition so the conversation keeps a 680-pixel column.
- **Code** is the exception to the measure: source files and code blocks run to **120 characters** where the window allows, growing left into the contents column so the comments column stays clear.
- **Below 1,280 pixels** every layout reads in one column, with comments under the paragraphs they discuss. Below 760 pixels the phone layout applies.

## Consequences

- **Good:** even margins frame the text; the comments column is wide enough for real cards at common laptop widths.
- **Costs:** at 1,440 pixels the comments column narrowed from 400 to 360 pixels; heavy discussions belong in the Review layout.
- **Costs:** the layout arithmetic lives in CSS custom properties in `src/ui/reader.css` and needs browser checks at several widths.

## Alternatives considered

- **Lay out from the left and give spare width to comments:** the previous direction, reversed here because the empty column read as a hole.
- **Scale the type with the window:** kept as an explicit choice (Fit to screen), not the default.

## Enforcement

- `e2e/reader.mjs` checks column gaps, alignment and that nothing overflows at 1,280, 1,360, 1,440 and 1,920 pixels, then 1,100, 900, 768, 760, 390 and 320 pixels; `e2e/files.mjs` covers the Files layout.
- [Design foundations, Layout](../design/foundations.md#layout) documents the properties and breakpoints.

## References

- `7896a54`, pull request [#30](https://github.com/m9rc1n/galley/pull/30) (with before and after measurements); layouts from pull request [#23](https://github.com/m9rc1n/galley/pull/23).
