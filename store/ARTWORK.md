# Galley mission artwork

**Make room for better reviews.**

Galley exists to make reviewing clearer, calmer and easier on the people who do it. The artwork pairs a readable change with a thoughtful question and a reply: understanding and conversation belong together.

Warm paper, forest ink and a muted green insertion keep the emphasis on the words. The extension's existing proof-text icon anchors the identity. Locally bundled Newsreader and DM Sans fonts, inline SVG and typeset HTML make the artwork reproducible without hosted fonts or external image services. The same fonts, sage insertions, rose deletions and replacement spacing are used in the website and reader.

The illustrated review is labelled as an illustration. Product screenshots come from the actual demo reader. Privacy copy names concrete boundaries: open source, local rendering, no analytics and no Galley server. The README and privacy policy explain that files are fetched from the code host, comments are posted back to the review, and loading external images is a choice.

## Sources and outputs

| Source | Output |
| --- | --- |
| `templates/promo-small.html` | `assets/promo-small-440x280.jpg` — 440 × 280 |
| `templates/promo-marquee.html` | `assets/promo-marquee-1400x560.jpg` — 1400 × 560 |
| `templates/promo-marquee.html` | `assets/readme-hero-1600x640.png` — 1600 × 640 |
| `templates/social-preview.html` | `assets/social-preview-1280x640.png` — 1280 × 640, the GitHub social preview (upload it under Settings → General → Social preview) |
| `templates/avatar.html` | `assets/galley-avatar-1024.png` — 1024 × 1024, the avatar for a GitHub organization or profile |
| The real demo reader | Five product screenshots — 1280 × 800 |

`npm run artwork` opens a local preview server at http://localhost:4180, including the rendered README. It serves only the artwork, generated screenshots and named project documentation. The local README preview omits remote badge images.

`npm run store-assets` rebuilds the reader and regenerates all artwork, screenshots and the store icon. It requires Chrome; set `CHROME_PATH` if Chrome is installed outside the usual locations. `scripts/artwork.mjs` supplies the same artwork HTML to both commands.
