# Add a reader setting

A setting is a choice the reviewer makes once and Galley remembers. Before adding one, ask whether a good default would do: every setting is one more thing to read in the sheet. Settings belong in one of the four tabs: **Reading** (how text looks), **Layout** (how the window is shared), **Review** (what is shown and how changes are marked) or **Keys**.

## 1. The model: `src/ui/settings.ts`

1. Add the field to `Settings`, with a doc comment that says what each value does for the reviewer.
2. Add its default to `DEFAULT_SETTINGS`. Prefer the behaviour most reviewers want, and the one that matches today's behaviour so upgrading changes nothing.
3. Validate it in `loadSettings()`. Stored settings come from older versions and can hold anything: map unknown values to the default, as the existing fields do (`saved.order === 'listed' ? 'listed' : 'suggested'`). If you rename or split a setting, migrate the old value, as `theme` and `appearance` do.

## 2. The control: `src/ui/reader.ts`

Add a row to the right tab panel in `TEMPLATE`, following the existing rows (`.mr-set-row`: label with an optional `small` explanation, then the control):

- **Two to four values:** a segmented control. Add the key to the `SettingKey` union and use `data-setting="yourKey"` with `data-value` buttons. `onClick()` and `applySettings()` already handle any `data-setting` group, including `aria-pressed`.
- **On or off:** a switch, `button.mr-switch` with `role="switch"`, `data-act="your-act"` and `aria-labelledby` pointing at the label's id. Add a `case` in `onClick()` that calls `this.update({ yourKey: !this.settings.yourKey })`, and set `aria-checked` in `applySettings()`.

Write the label and explanation with [COPY.md](../COPY.md): name what the reviewer chooses, explain the benefit in the `small` line.

## 3. The effect: `applySettings()`

Apply the setting where it takes effect, keeping the one-way flow (`update()` → `applySettings()` → save):

- **Visual only:** set a class or data attribute on `.mr-root` (`r.classList.toggle('no-signs', !s.signs)`) and style it in `src/ui/reader.css` with tokens. No per-palette rules.
- **Changes rendering:** re-apply to rendered views (see `applyCodeView()`), never re-fetch content. Keep drafts, scroll position and Viewed state across the change.
- Call `this.schedule(true)` if layout moves.

## 4. Tests

- `src/ui/settings.test.ts`: the default, a stored value round-trips, an unknown stored value falls back, and any migration.
- A reader test (`src/ui/reader*.test.ts`, using the harness in `src/testing/reader.ts`): clicking the control changes the DOM and `aria-pressed` or `aria-checked`, and survives reopening the reader.
- Every new branch covered: `npm run test:coverage` must stay at 100% ([ADR 0017](../adr/0017-full-coverage-of-every-file.md)).
- A browser check in `e2e/reader.mjs` if the setting changes layout, focus or contrast.

## 5. Words and pictures

- [docs/GUIDE.md](../GUIDE.md#settings): add it to the settings table and to the section it affects.
- [README.md](../../README.md): update the counts or the **Keys** table if they change.
- [Glossary](../glossary.md) and the [UI map](../design/ui-map.md) if it names a new thing.
- If the settings sheet changed visibly, `npm run store-assets` redraws `reader-settings.jpg` and the store screenshots.

## Done when

`npm run check` passes, `npm run test:e2e` passes, the setting shows in light and dark at 1,440 and 390 pixels, and the pull request title is `feat(reader): …`.
