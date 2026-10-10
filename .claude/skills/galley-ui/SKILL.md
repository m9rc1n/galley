---
name: galley-ui
description: Design and build Galley's interface the way the rest of it is built. Use when changing anything a reviewer sees or touches in the reader overlay, the toolbar popup, the Read launcher or the website (layout, CSS, colour tokens, palettes, typography, settings, keyboard shortcuts, menus, comments UI, empty and error states), or when asked to review, critique or document the UI.
---

# Galley UI

Galley's interface exists so a reviewer can understand a change and say something useful about it. You are designing for long, careful reading on every screen size, in nineteen palettes, light and dark, by keyboard, mouse, touch and screen reader.

## Read first

1. [Design principles and review checklist](../../../docs/design/README.md): the seven rules every change is checked against.
2. [UI map](../../../docs/design/ui-map.md): find the surface you are changing, its code, its states and its tests.
3. [Foundations](../../../docs/design/foundations.md): tokens, type scale, spacing, breakpoints, stacking, motion, icons.
4. [Interaction patterns](../../../docs/design/patterns.md): controls, layers and focus, feedback, errors, commenting, folding.
5. [Accessibility](../../../docs/design/accessibility.md): the bar and how it is measured.
6. ADRs for the reader: [0004](../../../docs/adr/0004-reader-as-a-shadow-dom-overlay.md) overlay, [0005](../../../docs/adr/0005-plain-typescript-and-dom.md) plain DOM, [0013](../../../docs/adr/0013-reading-palettes-as-token-sets.md) palettes, [0018](../../../docs/adr/0018-centre-the-text-on-wide-screens.md) layout.

## Where things are

- `src/ui/reader.ts`: the `Reader` class. `TEMPLATE` holds the fixed markup (top bar, settings sheet, lightbox, toast, pill); `onClick()` dispatches on `data-act`; `onKey()` handles shortcuts; `update()` → `applySettings()` applies settings; `schedule()` batches layout.
- `src/ui/reader.css`: one deliberate cascade. Tokens and palettes at the top, then chrome, layout, typography, changes, rail, comments, threads, syntax colours, layouts and density, code views. Find the section by its `/* ---- name */` header.
- `src/ui/settings.ts`: the settings model and storage.
- `src/ui/icons.ts`, `src/ui/fonts.ts`, `src/ui/chapters.ts`, `src/ui/launcher.ts`, `src/popup/`, `site/`.

## How to make a change

1. **Start from the reviewer's task**, in a sentence: "While reading a long RFC, I want to …". If it is a new surface, new stored data or a workflow change, it needs an RFC first (`decision-records` skill).
2. **Reuse before you invent.** Use an existing control (segmented control, switch, chip, disclosure, card) and an existing place (byline, margin, comments column, settings tab). A new pattern gets documented in `docs/design/patterns.md` in the same change.
3. **Tokens only.** No raw colours, no new breakpoints, no z-index outside the stacking table. Change colours (green, amber, rose, accent tint for moved) mean change and nothing else, and always come with a second cue.
4. **Every input, in the same change:** keyboard path and shortcut (`SHORTCUTS`), visible focus, `aria-*` state, touch target of 44 pixels on phones and `(hover: none)`, reduced motion, and text that scales with `--type`.
5. **Write the words** with the `ux-copy` skill. Use the labels that appear on screen.
6. **Test every branch** (`galley-tests`), then **look at it** (`verify-ui`): 1,440 and 390 pixels, light and dark, Comfortable and Compact.
7. **Update the docs a reviewer reads:** `docs/GUIDE.md`, README counts and keys, the UI map, and store screenshots if the look changed (`npm run store-assets`).

How-to recipes: [add a setting](../../../docs/how-to/add-a-setting.md), [add a palette](../../../docs/how-to/add-a-palette.md), [add a shortcut](../../../docs/how-to/add-a-shortcut.md).

## Judgement calls, and how this product answers them

- **More options or a better default?** A better default. Settings exist for reading comfort and for opposite needs (marks or clean, changed parts or whole files), not for indecision.
- **Explain with a tooltip or with the layout?** With the layout and a visible label; tooltips only add a shortcut or a detail.
- **Banner, modal or inline?** Inline, beside what it concerns. Toasts confirm an action the reviewer took. Full-page messages are for load failures, with **Back to the diff**.
- **Animate?** Only to show where something went, briefly, and never under reduced motion.
- **Infer or ask?** Ask, or show the evidence. Galley states facts about the source and never claims understanding, correctness or intent.
- **Hide or fold?** Fold, and say what is folded and how much.

## Critiquing the UI

When asked to review a design or screenshot, report against the principles and checklist in `docs/design/README.md`, most severe first: accessibility failures, misleading states, broken layouts at a width, inconsistency with patterns, then polish. Name the surface by its UI map name and propose a concrete change with the token or pattern to use.
