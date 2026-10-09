# Galley artwork

**Understand changes. Review together.** Galley helps teams follow code and document changes with readable content, edits in context and comments beside the text. Artwork should show that benefit clearly, using the friendly, plain language in [COPY.md](../docs/COPY.md).

- **The hero** (README, store marquee, social preview) puts a cramped monospace diff behind the same review in Galley: a paragraph and a code change with the edit marked in place, a margin conversation ("Does this cover batch uploads?" "Yes. Example added."), Viewed progress and the keys that move you around. It is labelled as an illustration.
- **The store screenshots** are real reader captures from the demo, each under one line of copy that says what it shows. Nothing in them is mocked up or retouched.
- **The before/after** sets the demo's diff view beside the real reader on the same merge request.

Warm paper, forest ink, sage insertions and rose deletions are the reader's own colours; Newsreader and DM Sans are the reader's own fonts, bundled with the extension, so every image renders without hosted fonts or image services.

## Sources and outputs

| Source | Output |
| --- | --- |
| The demo, through the real reader | `assets/reader-*.jpg`: eight 1280 × 800 captures at 2×, used by the website and the screenshots below |
| `templates/screenshot.html` | `assets/screenshot-1-read.jpg` … `screenshot-5-comfort.jpg`: the five 1280 × 800 store screenshots |
| `templates/hero.html` | `assets/readme-hero-1600x640.png` (README) and `assets/promo-marquee-1400x560.jpg` (store marquee) |
| `templates/social-preview.html` | `assets/social-preview-1280x640.png`: the GitHub social preview (Settings → General → Social preview) and the website's link preview |
| `templates/promo-small.html` | `assets/promo-small-440x280.jpg`: the store's small promo tile |
| `templates/before-after.html` | `assets/before-after-1600x640.jpg`: the README's before/after |
| `templates/avatar.html` | `assets/galley-avatar-1024.png`: the README logo and the avatar for a GitHub organisation or profile |

`npm run store-assets` rebuilds the reader, captures the screenshots and renders all of the above. It requires Chrome; set `CHROME_PATH` if Chrome is installed outside the usual locations. `scripts/artwork.mjs` lists every image, its template, size and copy; the screenshot captions live there too.

`npm run artwork` opens a local preview at http://localhost:4180 with every image and the rendered README. The local README preview omits remote badge images.
