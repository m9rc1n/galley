# Verify a UI change

Unit tests prove behaviour; only a browser shows whether the change reads well. Do this for anything a reviewer would see.

## 1. Look at it

```bash
npm run demo          # http://localhost:4173, the real reader on a sample review
```

Demo variants: `?spec` (a test file as a plan), `?comments` (code comments as notes), `?large` (folded files, moved code, the declaration line), `?chapters` (the chapter map), `?code-only`, `?diagram-error`.

For the extension itself on real pull requests, `npm run dev` and load `dist/dev` once in `chrome://extensions` ([CONTRIBUTING.md](../../CONTRIBUTING.md#develop-in-your-own-chrome)).

## 2. Screenshot the states

`npm run screenshots` builds the demo, opens it in Chrome and saves screenshots of the reader to `reports/screenshots/`: at 1,440, 1,100 and 390 pixels, in light and dark, plus the settings sheet. Choose what to capture:

```bash
npm run screenshots -- --widths 1440,390 --palettes sage,contrast --appearances dark --demo large
npm run screenshots -- --help
```

Look at every image. Check against the [design review checklist](../design/README.md#review-checklist).

## 3. Run the browser checks

```bash
npm run test:e2e      # layout at many widths, focus, selection, contrast in all palettes; screenshots in reports/e2e/
npm run test:site     # if the website changed
```

`CHROME_PATH` points the checks at a specific Chrome or Chromium.

## 4. Refresh the pictures people see

If the reader looks different, `npm run store-assets` redraws the screenshots used by the README, the website and the store listings ([store/ARTWORK.md](../../store/ARTWORK.md)). Include a before and after screenshot in the pull request.
