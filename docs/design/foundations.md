# Design foundations

The building blocks of the reader's look, as implemented in `src/ui/reader.css` and `src/ui/settings.ts`. Use these values and tokens; do not introduce new raw colours, sizes or breakpoints without adding them here.

- [Colour](#colour)
- [Typography](#typography)
- [Space and rhythm](#space-and-rhythm)
- [Layout](#layout)
- [Elevation and stacking](#elevation-and-stacking)
- [Shape](#shape)
- [Motion](#motion)
- [Icons](#icons)
- [Other surfaces](#other-surfaces)

## Colour

Colour is a set of CSS custom properties on `.mr-root`. A **palette** (`data-theme` on the root) sets their values; the **appearance** (`is-dark` class, from System, Light or Dark) chooses the light or dark version. The two are independent ([ADR 0013](../adr/0013-reading-palettes-as-token-sets.md)).

### Surface and text tokens

| Token | Role | Contrast floor |
| --- | --- | --- |
| `--bg` | The page | — |
| `--fg` | Body text | 7:1 on `--bg` |
| `--muted` | Secondary text: bylines, captions, settings notes | 4.5:1 on `--bg`, `--card`, `--soft` |
| `--soft` | Control surfaces, hover fills | stands apart from `--bg` (1.8:1 in dark) |
| `--rule` | Decorative dividers (hairlines, borders that are not controls) | none: rules are quiet |
| `--control-rule` | Borders of editable fields | 3:1 on `--card` |
| `--card` | Comment cards, folded-file cards, settings sheet in dark | stands apart from `--bg` (1.45:1 in dark) |
| `--code-bg` | Code blocks and source files | stands apart from `--bg` (1.15:1 in dark) |
| `--accent` | Focus rings, selection, links, the selected choice; never decoration | 3:1 on `--bg` and `--card` |
| `--selected-bg` | The pressed segment of a segmented control | its text 4.5:1 |
| `--shadow`, `--card-shadow`, `--raised-shadow` | Sheets; cards at rest; cards on hover or focus | — |

### Change tokens

| Token | Role | Contrast floor |
| --- | --- | --- |
| `--add`, `--add-bg`, `--add-wash` | Added text and its highlight; a lighter wash | `--add` 4.5:1 on `--add-bg` |
| `--mod` | Edited (amber): dots and chips | — |
| `--del`, `--del-bg`, `--del-strike` | Removed text, its highlight, the strike line | `--del` 4.5:1 on `--del-bg` |
| `--ins-band` | Inserted-word highlight in prose | `--fg` and `--muted` 4.5:1 on it |
| `--gutter-added`, `--gutter-modified`, `--gutter-removed` | Margin bars beside changed blocks | 3:1 on `--bg` |
| `--code-add`, `--code-del` | Changed code-line tints | every `--hl-*` token 4.5:1 on them |
| `--code-moved`, `--gutter-moved` | Moved code: a tint of the accent, not green or rose | every `--hl-*` token 4.5:1 |

### Syntax tokens

`--hl-comment`, `--hl-keyword`, `--hl-string`, `--hl-number`, `--hl-title`, `--hl-attr`, `--hl-builtin`, `--hl-tag`, `--hl-meta`: quiet, per palette, so code reads as code without competing with change marks. Each meets 4.5:1 on `--code-bg`, `--code-add`, `--code-del` and `--code-moved`.

### Palettes

Nineteen, in this order (neutral, warm, cool, then the expressive ones), each with a light and a dark version: Paper, E-ink, Cream, Sepia, Night, Blush, **Sage** (default), Seafoam, Slate, Nord, Dusk, Contrast, Ocean, Clay, Orchid, Graphite, Hackerman, Aurora and Sunset. Aurora and Sunset add `--page-art`, gradients in the margins that fade to plain paper under the text. The settings carousel shows six to a page; each card previews the real page in the current appearance with the same tokens.

### Rules

- Components use tokens only. A palette may override any token; it must not need component-specific rules.
- The accent marks interaction (focus, selection, the chosen option, links), not decoration. Your own conversations carry "a hint of the accent".
- Change colours always pair with a second cue: a strike line, a word ("3 added"), a dot with a label, or a margin bar position.
- New palette or token? `npm run test:e2e` measures every sample and fails below its floor; see [How to add a palette](../how-to/add-a-palette.md).

## Typography

| Face | Family name in CSS | Used for |
| --- | --- | --- |
| Newsreader | `--serif` (`"Galley Newsreader"`) | Titles, headings and quotations in the **Galley** pairing; body text in **Newsreader** |
| DM Sans | `--sans` (`"Galley DM Sans"`) | All interface text; running text in the **Galley** pairing and in **DM Sans** |
| System monospace | `--mono` | Code, keys (`kbd`) |

The **Typeface** setting (`data-font` on the root) picks the body face: Galley (Newsreader headings with DM Sans text), Newsreader (the default), DM Sans, Georgia, System or Monospace. Fonts are bundled ([ADR 0012](../adr/0012-bundle-fonts-and-engines.md)).

### Scale

- **Body text:** 17, 18, **20** (default), 22 or 24 pixels (`TEXT_SIZES`), set as `--body-size`. `--text-scale` is the chosen size over 20, and `--type` multiplies it by the Fit-to-screen factor, so titles, bylines, the contents and comments grow with the text.
- **Document title:** `calc(52px * var(--type))`, weight 400, line height 1.08, tracking −0.028em; 40 pixels in Compact. Source-file titles are smaller (28 pixels in Compact) so long paths fit.
- **Standfirst:** `calc(22px * var(--type))`, `--muted`.
- **Byline:** `calc(14px * var(--type))`, DM Sans, `--muted`, between two hairlines.
- **Comments:** `--comment-size`, `calc(13.5px * var(--type))`; 15 pixels in the Review layout.
- **Code:** `--code-size`, 0.65 of the body size; source files fit 120 characters plus the gutter on wide screens.
- **Interface:** 14 pixels base, 13 pixels in segmented controls and toasts, 12 pixels in the Keys list, 11 pixels in `kbd`.

### Measure and leading

- **Measure:** 680 pixels of text in Balanced (`--measure-max`), 640 in Review, 920 in Wide text, 720 in Focus.
- **Leading:** `--leading` 1.58 for prose (1.46 Compact), `--list-leading` 1.42 for wrapped list items (1.35 Compact).

## Space and rhythm

Vertical rhythm is set in `em`, so it follows the text size:

| Token | Comfortable | Compact | Between |
| --- | --- | --- | --- |
| `--block-gap` | 1.5em | 0.9em | Blocks |
| `--heading-gap` | 1.95em | 1.35em | A heading and what precedes it |
| `--item-gap` | 0.75em | 0.4em | List items |

Interface spacing uses multiples of 2 and 4 pixels: 6-pixel gaps inside buttons, 12-pixel gaps between cards (`CARD_GAP`), 14-by-16-pixel card padding (10 by 12 in Compact), 24-pixel window edges (`--edge`). The page starts 64 pixels below the top bar (56 in Compact, 32 on phones in Compact).

## Layout

### Breakpoints

| Width | Composition |
| --- | --- |
| 1,280 pixels and up | Three columns: contents (176 pixels, 80-pixel gap), text, comments column (360 to 440 pixels, 56-pixel gap). The **Layout** setting applies. |
| 761 to 1,279 pixels | One column. Comments sit under the paragraphs they discuss; the contents rail is hidden. |
| 760 pixels and below | Phone: the wordmark gives way to the file name, settings become a bottom sheet, touch targets grow to 44 pixels. |
| 380 and 360 pixels and below | Tighter palette grid and top bar. |

Also used: `(hover: none)` for touch screens (same treatment as phones for targets and hover-only controls), `(max-width: 860px)` for the comment button, and `(prefers-reduced-motion: reduce)`.

### Wide-screen arithmetic

The text is centred; contents and comments live in its margins ([ADR 0018](../adr/0018-centre-the-text-on-wide-screens.md)). The rules derive `--text-left`, `--left`, `--rail-width` and `--rail-end` from a handful of inputs each layout sets:

| Property | Meaning | Balanced |
| --- | --- | --- |
| `--measure-max` | Longest text line | 680px |
| `--toc-width`, `--toc-gap` | Contents column and its gap | 176px, 80px |
| `--rail-min`, `--rail-max` | Comments column bounds; the text moves left only to keep `--rail-min` | 360px, 440px |
| `--rail-gap` | Gap between text and comments | 56px |
| `--shift` | Moves the composition's centre (Review centres text plus comments) | 0 |
| `--fit` | Fit-to-screen scale, 1 to 1.5, from the window width over 1,440 | 1 |

Code is the exception: source files run to 120 characters (`--code-width`, `--code-span`, starting at `--code-left`), and code blocks in documents grow left to their longest line (`--chars` from `render.ts`), so the comments column stays clear.

### Layouts

| Layout | `data-layout` | What changes |
| --- | --- | --- |
| Balanced | `balanced` | The defaults above |
| Files | `files` | The left margin lists every file, the current one open to its headings |
| Review | `review` | Text 640px, comments 680px with 15px text, composition centred |
| Wide text | `wide` | Text 920px |
| Focus | `focus` | No contents; text 720px centred; comments below their paragraphs |
| Fit to screen | `fit` | The Balanced composition for 1,440px, scaled by `--fit` |

Project library shares **Focus**, **Balanced** and **Wide text** through `layout-controls.ts`. Focus and Balanced use a 680px maximum article measure; Wide text uses 920px, constrained by equal space for the contents rail on both sides. `repo.css` centres the article without reserving a comments column. Focus hides the rail; at widths below 1,280px every layout uses one column. Its layout is session-scoped, independent of the review's saved layout.

**Density** (`data-density`: `comfortable` or `compact`) changes rhythm, title sizes and card padding, never proportions, so it works with every layout and size.

## Elevation and stacking

Inside the reader's root, in order:

| z-index | Layer |
| --- | --- |
| 1, 2, 3 | The document, the margin bars (`.mr-gutter`), the comment button beside a block |
| 5 | Contents rail |
| 15 | Top bar (which holds the change-navigation pill); the Viewed feedback line |
| 20 | Document menu |
| 25 | Selection **Comment** chip |
| 30 | Progress bar, toast, resume offer |
| 40 | Settings sheet; enlarged diagram |
| 45 | Chapter map |

The reader itself sits at 2147483600, above the platform page; the launcher at 2147483000. Shadows grow with elevation: `--card-shadow` at rest, `--raised-shadow` on hover or focus, `--shadow` for sheets and the toast.

## Shape

- **Pills** (999px radius): buttons, segmented controls, the toast, chips, the launcher.
- **Cards:** 14px radius (10px in Compact) for threads and editors; 12px for folded-file cards and palette cards.
- **Sheets:** 20px radius for the settings panel.
- **Small marks:** 6px for previews and inputs, 2 to 4px for bars and keys, 50% for dots.

## Motion

Motion explains a change of place; it never decorates.

- Durations are short: 140 to 280ms for transforms (cards moving aside, the top bar, the pill), 180ms for the toast's entrance, 750ms for the top glow's fade.
- Easing is `ease` or `ease-out`.
- Under `prefers-reduced-motion: reduce`, transitions are removed and the top glow stays still. Browser checks run with reduced motion on.
- Navigation scrolls the target to 30% of the viewport height (`FOCUS_LINE`) and flashes it briefly.

## Icons

Icons are inline SVG strings in `src/ui/icons.ts`: `settings`, `close`, `plus`, `minus`, `check`, `layout`, `keyboard`, `comment`, `reply`, `viewed`, `chevronDown`, `chevronLeft`, `chevronRight`, `up`, `down` and `book`. They draw at 18 pixels (`.mr-icon`) in `currentColor`. An icon-only button always has an `aria-label` and a `title` that names its shortcut ("Close reader (Esc)").

## Other surfaces

- **Launcher** (`src/ui/launcher.ts`): its own shadow root and inline styles; a near-black pill (near-white in dark) at the bottom right, 44 pixels high, with the document count; red count on error.
- **Popup** (`src/popup/`): its own small token set (`--bg`, `--fg`, `--muted`, `--rule`, `--soft`, `--accent`) following the system appearance, 380 pixels wide with 24-pixel side padding, system font. The full-width Read action has 12 pixels of space before the page label; section padding is 16 pixels. Popup spacing is scoped separately from the extension settings page.
- **Website** (`site/`): Newsreader headlines and DM Sans text, self-hosted; see [site/README.md](../../site/README.md).
