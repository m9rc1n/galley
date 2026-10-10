# Interaction patterns

How the reader's controls behave, so a new feature feels like the rest. Each pattern names the code to copy. When you need something not listed here, add it here in the same pull request.

## Controls

| Control | Use it for | Markup | State |
| --- | --- | --- | --- |
| **Button** | An action | `button.mr-btn` with `data-act="…"`; `mr-icon-btn` for icon-only | Icon-only buttons need `aria-label` and a `title` naming the shortcut: "Close reader (Esc)" |
| **Segmented control** | One of two to four values of a setting | `.mr-seg` with `role="group"`, `aria-label`, `data-setting="<key>"`, and `button[data-value]` children | `aria-pressed="true"` on the chosen one, set by `applySettings()` |
| **Switch** | A setting that is on or off | `button.mr-switch` with `role="switch"`, `aria-checked`, `aria-labelledby` pointing at the row label | Toggle in `onClick()`, persist through `update()` |
| **Choice cards** | Visual choices (palettes, layouts) | `.mr-theme-options` with `data-setting`, cards with a preview, name, check icon and caption | `aria-pressed`; only the chosen card shows its check |
| **Select** | A long list of named values (typeface) | Native `select` inside `.mr-font-select` | `change` event calls `update()` |
| **Disclosure** | Showing hidden content in place | A button that names what it reveals: **N unchanged blocks**, **Show changes**, **View source**, **Browse tests** | `aria-expanded` where it toggles; the same right/down arrow everywhere |
| **Chip** | A fact about a file | `chip(kind, text)` → `.mr-chip.is-added` with a dot and a word | Never colour alone; links and buttons styled as chips still say what they do |

Settings rows follow one shape: a label with an optional `small` explanation on the left, the control on the right (`.mr-set-row`).

## Actions and events

- **One click handler.** `Reader.onClick()` reads `data-act` from the nearest element and does the work. New actions add a `data-act` value and a branch there, not their own listeners.
- **One key handler.** `Reader.onKey()` handles shortcuts when no field is focused and no sheet is open; the chapter map gets first refusal (`ChapterMap.onKey()`). Every shortcut is listed in `SHORTCUTS` (the Keys tab), the README's **Keys** table and the [user guide](../GUIDE.md).
- **Settings flow one way:** a control calls `update(patch)`, which merges, calls `applySettings()` (which sets root attributes and `aria-pressed` / `aria-checked` everywhere) and saves. Nothing else writes settings.
- **Layout is batched.** Anything that moves cards or bars calls `schedule(true)`; work happens in one animation frame.

## Layers and focus

Layers, innermost first: the enlarged diagram, the settings sheet or chapter map, the document menu, the selection chip, an editor, then the reader itself.

- **<kbd>Esc</kbd> closes the innermost layer** and nothing else. With an editor focused, <kbd>Esc</kbd> leaves it; an empty editor closes, and one with a draft stays ("Draft kept. Cancel discards it."). The reader closes last, and refuses while a comment is unsent ("You have an unsent comment. Post it, or choose Cancel to discard it.").
- **Focus moves in, and comes back.** Opening a sheet focuses its close button and marks the page behind `inert`; closing returns focus to the button that opened it. Closing the reader returns focus to where it was on the page.
- **Focus stays inside.** <kbd>Tab</kbd> cycles through the visible controls of the current layer (the diagram, the sheet, or the reader).
- **Tabs use roving focus.** Settings tabs move with the arrow keys, <kbd>Home</kbd> and <kbd>End</kbd>.
- **Menus close on an outside click** and when another opens (`closeMenus()`).

## Navigation

| Intent | Keys | Behaviour |
| --- | --- | --- |
| Next or previous change | <kbd>J</kbd> <kbd>K</kbd>, the pill | Scrolls the change to 30% of the viewport and flashes it |
| Next or previous conversation | <kbd>N</kbd> <kbd>P</kbd> | Same, for thread anchors |
| Next or previous file | <kbd>]</kbd> <kbd>[</kbd> | Follows the current file order |
| Any file | <kbd>F</kbd>, the file name | The document menu |
| A route through the review | <kbd>M</kbd>, **Chapters** | The chapter map |

Moving never changes state: it does not mark files Viewed, open folded files, or discard drafts.

## Feedback

- **Toasts** (`toast()`, `role="status"`) confirm what just happened in a few words, optionally with **View on platform**, and leave after six seconds. Use them for results of an action the reviewer took ("Comment posted", "Layout: Review"), not for errors that need action.
- **Inline status** sits next to what it describes: an editor's status line, the Viewed feedback line under the top bar, a chapter map's feedback line.
- **Progress** shows as text ("1 of 3 viewed", "Change 3 of 12"), never only as a bar.
- **Saving** is never claimed before it succeeded. A failed Viewed update restores the previous state and says so; storage failures are surfaced.

## Errors and empty states

- **Say what happened, then what to do.** `ReaderError` carries a message and a hint ("GitHub API rate limit reached." / "Wait a few minutes and try again."). A missing token adds the steps to create one.
- **Always offer a way out.** Full-page messages end with **Back to the diff**.
- **Never pretend content is empty.** A file that failed to load says so in the chapter map and the document menu; changes that cannot be shown are counted ("3 lines not shown") and linked to the platform diff.
- **Empty means helpful.** No documents? Explain and offer **Reading settings** to turn on **Code files**.
- **Writes are not retried.** A failed post keeps the draft and says to check the platform before posting again if the result is uncertain ([ADR 0008](../adr/0008-comment-through-platform-review-apis.md)).

## Loading

- Each file shows a skeleton until it renders; files load in reading order from the current one.
- Heavy work (diagrams, syntax colours, test plans) arrives after the text, from sandboxed frames, without moving what the reviewer is reading.
- Positions are restored only by an explicit **Continue**.

## Commenting

1. **Start** by selecting text (the **Comment** chip), pointing at a block (**Add a comment…** in the comments column), tapping a paragraph on touch screens, or pressing <kbd>R</kbd> for the paragraph in focus.
2. **The editor opens where the thread will appear**, level with its text, which stays tinted; other cards move aside. It names its target ("Comment on old lines 30–34") and says in advance if it will post a file comment instead of an inline one.
3. **Drafts persist** while the reader is open. Choosing the same text again returns to its draft; an untouched editor closes when you go elsewhere.
4. **Post** with **Comment** or ⌘/Ctrl Enter. Success shows a toast with **View on platform**; failure keeps the draft and explains.
5. **Reply** under any comment; replies to replies join the thread with an @mention, because platform threads are flat.

## Folding and context

- A fold always says what it hides and how much: "4 unchanged blocks"; "Lockfile · Written by a package manager when dependencies change · 1,204 added".
- Opening is one action, and the content opens exactly as it was left.
- Folding is not progress, and Viewed is not folding: marking a file Viewed folds it, but folding a file does not mark it Viewed.
- A file with a discussion never folds automatically.

## Copy in the interface

Follow [COPY.md](../COPY.md). In controls specifically:

- Label buttons with what happens: **Show changes**, **Save token**, **Back to the diff**, **Start here**.
- Name settings by what the reviewer chooses, with the choices as nouns: **Context: Changed parts / Whole files**.
- Use sentence case, no full stop in labels, and "…" only for actions that open something to type in (**Add a comment…**).
- Write numbers with separators and units: "1,204 added", "20 px", "lines 31–37" (en dash).
