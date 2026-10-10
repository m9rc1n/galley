# Designing Galley

Galley's interface has one job: help a reviewer understand a change and say something useful about it. Read this before changing anything a reviewer sees, in the reader, the popup, the launcher, the website or the store artwork.

| Document | Read it for |
| --- | --- |
| [Principles](#principles) (below) | The rules every design decision is checked against |
| [Foundations](foundations.md) | Colour tokens, type, space, layout, elevation, shape, motion, icons |
| [UI map](ui-map.md) | Every surface of the reader and popup: its name, code, states and tests |
| [Interaction patterns](patterns.md) | How controls, menus, feedback, errors, comments and navigation behave |
| [Accessibility](accessibility.md) | The bar every change meets, and how it is checked |
| [Voice and product copy](../COPY.md) | Words: tone, shared terms, claims |
| [Artwork](../../store/ARTWORK.md) | How the store and README images are made |

## Principles

These come from the product as it is built, not from a wish list. Each names the rule, why it holds, and what it looks like in the code.

### 1. The text is the interface

Reviewers came to read. The document gets the centre of the screen at a comfortable measure (680 pixels in Balanced) and the reader's own typography; controls stay at the edges and quiet until needed.

- **Do:** put new information where the reader already looks: the byline under a file's title, the margin beside a block, a card in the comments column.
- **Don't:** add banners, permanent sidebars or badges inside the text. The top bar has one row and the settings live in a sheet ([ADR 0018](../adr/0018-centre-the-text-on-wide-screens.md)).

### 2. Show the change where it happened

Edits are marked inside the sentence, table cell or code line, not in a separate list. Added is green, edited is amber, removed is rose, and moved is a tint of the accent, in every palette ([ADR 0013](../adr/0013-reading-palettes-as-token-sets.md)). Margin bars stay thin and half strength at rest, and strengthen when the text beside them is pointed at.

- **Do:** keep change colours for changes. A new status gets a chip with a dot and a word, never colour alone.
- **Don't:** tint whole new files or code blocks; say it once in the byline ("New document").

### 3. Calm by default, detail on demand

Unchanged sections fold to **N unchanged blocks**; lockfiles and generated files fold to one line; test files open as a plan; comments in code read as formatted notes. Every fold says what it hides and opens in one step ([ADR 0021](../adr/0021-suggested-order-and-folded-files.md)).

- **Do:** default to the reading most reviewers want, and make the full view one click or key away (<kbd>A</kbd> for whole files, **Show changes**, **Whole file (raw)**).
- **Don't:** hide content without saying how much, or require a setting to see something once.

### 4. The reviewer is in charge

Galley never posts, approves, marks Viewed, or decides on a reviewer's behalf. Progress counts only explicit actions; scrolling is never progress. Drafts are discarded only with **Cancel**; <kbd>Esc</kbd> keeps them.

- **Do:** make every consequential action explicit and its destination visible ("will post a quoted file comment").
- **Don't:** auto-advance, auto-mark, or infer intent ("you understood this file").

### 5. Say what is true, and no more

Labels describe the source, not its meaning: **Added**, **Edited**, **Moved to src/quota.ts, line 3**. Test plans say what the test code says, never whether it passes ([ADR 0020](../adr/0020-read-code-statically.md)). Chapters explain why files are grouped and use folder names, not guessed purposes ([ADR 0022](../adr/0022-review-chapters-from-evidence.md)). Failures say what happened and what to do next.

- **Do:** count what is hidden ("3 lines not shown") and link to the platform for it.
- **Don't:** claim success before it happened, or show an empty state where content failed to load.

### 6. Every reader, every screen, every input

Nineteen palettes, six typefaces, five text sizes, six layouts and two densities exist because reading comfort differs. Every feature works with the keyboard, a mouse, touch, a screen reader, at 320 pixels wide, in dark appearance and with reduced motion ([Accessibility](accessibility.md)).

- **Do:** add the keyboard shortcut, the touch target and the accessible name in the same change as the feature.
- **Don't:** ship hover-only affordances; on touch screens the same action must be reachable by tap.

### 7. Nothing leaves the browser by surprise

No server, no telemetry, no font services, external images behind consent ([ADR 0002](../adr/0002-no-server-no-telemetry.md), [ADR 0010](../adr/0010-external-images-behind-consent.md)). Where data is kept, the interface says so (the Viewed tooltip names where progress is saved).

## Working on the interface

1. **Find the surface** in the [UI map](ui-map.md): its code, its states and the tests that cover it.
2. **Build with tokens and patterns.** Colours, sizes and spacing come from [Foundations](foundations.md); controls follow [Interaction patterns](patterns.md). If a pattern is missing, add it there in the same pull request.
3. **Write the copy** with [COPY.md](../COPY.md): actual control labels, benefit first, light humour at most.
4. **Check it in the demo** (`npm run demo`), at the widths and states in the checklist below. The `verify-ui` agent skill takes the screenshots for you.
5. **Test it:** unit tests for every branch (100% coverage, [ADR 0017](../adr/0017-full-coverage-of-every-file.md)), and `npm run test:e2e` for layout, focus, selection and contrast.
6. **Update the docs** a reviewer would read: [the user guide](../GUIDE.md), the README's keys and counts, the store copy, and this folder.

### Review checklist

- [ ] Uses tokens only; no raw colours, and change colours only for changes.
- [ ] Light and dark, in at least Sage (the default), Paper, Sepia and Contrast; `npm run test:e2e` passes the contrast floors in all nineteen.
- [ ] 1,440 and 1,280 pixels (three columns), 1,100 (one column), 390 and 320 (phone); no horizontal scroll.
- [ ] Comfortable and Compact; text sizes 17 and 24 pixels; Balanced, Focus and Review layouts.
- [ ] Keyboard only: reachable, visible focus, <kbd>Esc</kbd> closes the innermost layer, focus returns where it came from.
- [ ] Touch: targets at least 44 pixels on phones and `(hover: none)` screens; no hover-only action.
- [ ] Screen reader: every control has a name; state is in `aria-pressed`, `aria-checked` or `aria-expanded`; status messages use `role="status"`.
- [ ] Reduced motion: nothing moves that does not have to.
- [ ] Empty, loading, error and very large states look intentional.
- [ ] Copy uses the reader's real labels and the shared terms in [COPY.md](../COPY.md).
