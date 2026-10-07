// Promotional artwork is a typeset illustration, shared by the store and README.
// Product screenshots are captured separately from the real reader.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iconSvg } from './icons.mjs';

export const ARTWORK = [
  { template: 'promo-small.html', name: 'promo-small-440x280.jpg', width: 440, height: 280, type: 'jpeg' },
  { template: 'promo-marquee.html', name: 'promo-marquee-1400x560.jpg', width: 1400, height: 560, type: 'jpeg' },
  { template: 'promo-marquee.html', name: 'readme-hero-1600x640.png', width: 1600, height: 640, type: 'png' },
  { template: 'social-preview.html', name: 'social-preview-1280x640.png', width: 1280, height: 640, type: 'png' },
  { template: 'avatar.html', name: 'galley-avatar-1024.png', width: 1024, height: 1024, type: 'png' },
];

const fonts = Promise.all([
  ['Galley Newsreader', 'newsreader-latin.woff2', '400 600'],
  ['Galley DM Sans', 'dm-sans-latin.woff2', '400 700'],
].map(async ([family, file, weight]) => {
  const bytes = await readFile(fileURLToPath(new URL(`../src/ui/fonts/${file}`, import.meta.url)));
  return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${bytes.toString('base64')}) format("woff2")}`;
}));

export async function artworkHtml(artwork) {
  const template = await readFile(fileURLToPath(new URL(`../store/templates/${artwork.template}`, import.meta.url)), 'utf8');
  const canvas = `<style>${(await fonts).join('')}:root{--serif:"Galley Newsreader",Georgia,serif;--sans:"Galley DM Sans",Arial,sans-serif;--artwork-width:${artwork.width}px;--artwork-height:${artwork.height}px;--artwork-scale:${artwork.width / 1400}}</style>`;
  return template.replaceAll('{{ICON}}', iconSvg()).replace('</head>', `${canvas}</head>`);
}
