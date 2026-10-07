// Promotional artwork is a typeset illustration, shared by the store and README.
// Product screenshots are captured separately from the real reader.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iconSvg } from './icons.mjs';

export const ARTWORK = [
  { template: 'promo-small.html', name: 'promo-small-440x280.jpg', width: 440, height: 280, type: 'jpeg' },
  { template: 'promo-marquee.html', name: 'promo-marquee-1400x560.jpg', width: 1400, height: 560, type: 'jpeg' },
  { template: 'promo-marquee.html', name: 'readme-hero-1600x640.png', width: 1600, height: 640, type: 'png' },
];

export async function artworkHtml(artwork) {
  const template = await readFile(fileURLToPath(new URL(`../store/templates/${artwork.template}`, import.meta.url)), 'utf8');
  const canvas = `<style>:root{--artwork-width:${artwork.width}px;--artwork-height:${artwork.height}px;--artwork-scale:${artwork.width / 1400}}</style>`;
  return template.replaceAll('{{ICON}}', iconSvg()).replace('</head>', `${canvas}</head>`);
}
