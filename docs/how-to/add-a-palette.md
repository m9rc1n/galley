# Add a reading palette

A palette is a set of colour token values with a light and a dark version ([ADR 0013](../adr/0013-reading-palettes-as-token-sets.md)). Nineteen exist; a new one should serve a reading need the others do not (a sensitivity, a time of day, a screen type), not just a colour preference.

## 1. Register it

- `src/ui/settings.ts`: add the id to `THEMES`, in its place in the order (neutral, warm, cool, then expressive).
- `src/ui/reader.ts`: add `[id, 'Name', 'Short caption']` to `PALETTES`, in the same place. The caption says what it is like ("Warm paper", "Arctic blue"). The carousel shows six to a page and its dots update by themselves.

## 2. Light values: `src/ui/reader.css`

Add a block next to the other light palettes. The selector covers both the page and the palette card that previews it:

```css
.mr-root[data-theme="id"],
.mr-theme-options [data-value="id"] {
  --bg: …; --fg: …; --muted: …; --soft: …; --rule: …; --code-bg: …; --accent: …;
  /* Change colours tinted to sit on this page: green, amber and rose stay recognisable. */
  --add: …; --add-bg: …; --add-wash: …; --mod: …;
  --del: …; --del-bg: …; --del-strike: …; --ins-band: …;
  --gutter-added: …; --gutter-modified: …; --gutter-removed: …;
  --code-add: …; --code-del: …;
}
```

Only override what differs from the defaults at the top of the file. Start from the nearest existing palette.

## 3. Dark values

Add the dark block next to the other dark palettes:

```css
.mr-root.is-dark[data-theme="id"],
.is-dark .mr-theme-options [data-value="id"] {
  --bg: …; --fg: …; --muted: …; --soft: …; --rule: …; --code-bg: …; --accent: …; --card: …;
}
```

The shared dark change colours apply unless the palette needs its own.

## 4. Syntax colours

If the default `--hl-*` tokens do not reach 4.5:1 on this palette's code backgrounds, add a syntax block in the "syntax colours" section, as Night and Hackerman do.

## 5. Optional page art

Expressive palettes may set `--page-art` to gradients that live in the margins and fade to plain paper under the text, as Aurora and Sunset do. Text must still meet its floors over the plain page.

## 6. Check contrast

```bash
npm run test:e2e
```

The browser checks measure every palette in light and dark and fail on any sample under its floor; `reports/e2e/contrast.json` lists every ratio. The floors are in [Foundations, Colour](../design/foundations.md#colour). Each palette must also have a background no other palette uses, in each appearance.

## 7. Words

Update the palette count and list in [README.md](../../README.md), [docs/GUIDE.md](../GUIDE.md#settings), [Foundations](../design/foundations.md#palettes), [store/LISTING.md](../../store/LISTING.md) and the website if they name the palettes.

## Done when

`npm run check` and `npm run test:e2e` pass, and you have looked at the palette in the demo with a document, a code file, a diagram and a comment thread, light and dark. The pull request title is `feat(reader): …`.
