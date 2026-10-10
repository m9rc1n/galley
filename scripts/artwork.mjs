// Promotional artwork is typeset HTML, shared by the store, the README and the website.
// Product screenshots are captured separately from the real reader (scripts/store-assets.mjs); the
// artwork that shows them embeds those captures, so it always shows the reader as it is.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iconSvg } from './icons.mjs';

/** Real reader captures (1280 × 800 at 2×), written by store-assets.mjs and reused by the artwork. */
export const CAPTURES = [
  'reader-changes.jpg',
  'reader-diff.jpg',
  'reader-comments.jpg',
  'reader-code.jpg',
  'reader-tables.jpg',
  'reader-diagram.jpg',
  'reader-dark.jpg',
  'reader-settings.jpg',
];

/** A Chrome Web Store screenshot: a real capture under one line that says what it shows. */
const screenshot = (name, image, kicker, caption) => ({
  template: 'screenshot.html',
  name,
  width: 1280,
  height: 800,
  type: 'jpeg',
  vars: { KICKER: kicker, CAPTION: caption },
  images: { IMAGE: image },
});

export const ARTWORK = [
  screenshot('screenshot-1-read.jpg', 'reader-changes.jpg', 'Clearer reviews for GitHub & GitLab', 'Understand changes. Review in peace.'),
  screenshot('screenshot-2-button.jpg', 'reader-diff.jpg', 'One click from the diff', 'Press Read on any pull or merge request.'),
  screenshot('screenshot-3-comments.jpg', 'reader-comments.jpg', 'Review together', 'Discuss the change beside the text.'),
  screenshot('screenshot-4-code.jpg', 'reader-code.jpg', 'Readable code', 'Long lines wrap. Comments sit beside the line.'),
  screenshot('screenshot-5-comfort.jpg', 'reader-settings.jpg', 'Your reading preferences', '19 palettes, 6 typefaces, 6 layouts. Light or dark.'),
  { template: 'promo-small.html', name: 'promo-small-440x280.jpg', width: 440, height: 280, type: 'jpeg' },
  { template: 'hero.html', name: 'promo-marquee-1400x560.jpg', width: 1400, height: 560, type: 'jpeg' },
  { template: 'hero.html', name: 'readme-hero-1600x640.png', width: 1600, height: 640, type: 'png' },
  {
    template: 'before-after.html',
    name: 'before-after-1600x640.jpg',
    width: 1600,
    height: 640,
    type: 'jpeg',
    images: { BEFORE: 'reader-diff.jpg', AFTER: 'reader-changes.jpg' },
  },
  { template: 'social-preview.html', name: 'social-preview-1280x640.png', width: 1280, height: 640, type: 'png' },
  { template: 'avatar.html', name: 'galley-avatar-1024.png', width: 1024, height: 1024, type: 'png' },
];

const fonts = Promise.all(
  [
    ['Galley Newsreader', 'normal', 'newsreader-latin.woff2', '400 600'],
    ['Galley Newsreader', 'italic', 'newsreader-italic-latin.woff2', '400 600'],
    ['Galley DM Sans', 'normal', 'dm-sans-latin.woff2', '400 700'],
  ].map(async ([family, style, file, weight]) => {
    const bytes = await readFile(fileURLToPath(new URL(`../src/ui/fonts/${file}`, import.meta.url)));
    return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format("woff2")}`;
  }),
);

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function artworkHtml(artwork) {
  let html = await readFile(fileURLToPath(new URL(`../store/templates/${artwork.template}`, import.meta.url)), 'utf8');
  for (const [key, value] of Object.entries(artwork.vars ?? {})) html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  for (const [key, file] of Object.entries(artwork.images ?? {})) {
    const bytes = await readFile(fileURLToPath(new URL(`../store/assets/${file}`, import.meta.url)));
    html = html.replaceAll(`{{${key}}}`, `data:image/jpeg;base64,${bytes.toString('base64')}`);
  }
  const canvas = `<style>${(await fonts).join('')}:root{--serif:"Galley Newsreader",Georgia,serif;--sans:"Galley DM Sans",Arial,sans-serif;--artwork-width:${artwork.width}px;--artwork-height:${artwork.height}px;--artwork-scale:${artwork.width / 1400}}</style>`;
  return html.replaceAll('{{ICON}}', iconSvg()).replace('</head>', `${canvas}</head>`);
}
