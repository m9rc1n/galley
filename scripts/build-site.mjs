// Assembles a self-contained GitHub Pages artifact after scripts/build.mjs.
// All local URLs are relative, so the same files work at /galley/ or a custom-domain root.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import markdownit from 'markdown-it';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = `${root}dist/site`;
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/assets`, { recursive: true });
for (const file of ['index.html', 'styles.css', 'main.js']) await cp(`${root}site/${file}`, `${out}/${file}`);
await cp(`${root}src/ui/fonts`, `${out}/fonts`, { recursive: true });
const assets = {
  'src/icons/icon128.png': 'icon.png',
  'store/assets/readme-hero-1600x640.png': 'social.png',
  'store/assets/screenshot-1-changes.jpg': 'reader-changes.jpg',
  'store/assets/screenshot-3-tables.jpg': 'reader-tables.jpg',
  'store/assets/screenshot-4-clean-dark.jpg': 'reader-dark.jpg',
};
for (const [source, target] of Object.entries(assets)) await cp(`${root}${source}`, `${out}/assets/${target}`);
await mkdir(`${out}/demo`, { recursive: true });
for (const file of ['index.html', 'samples', 'build'])
  await cp(`${root}demo/${file}`, `${out}/demo/${file}`, { recursive: true });
await cp(`${root}dist/chrome/THIRD_PARTY_NOTICES.txt`, `${out}/demo/THIRD_PARTY_NOTICES.txt`);
// Give the existing demo a route back to the website without changing the local development demo.
const demo = await readFile(`${out}/demo/index.html`, 'utf8');
await writeFile(
  `${out}/demo/index.html`,
  demo
    .replace(
      '<title>Galley demo</title>',
      '<title>Galley — Live reader demo</title><link rel="icon" href="../assets/icon.png"><meta name="robots" content="noindex">',
    )
    .replace(
      '<span class="logo">acme</span>',
      '<a class="logo" href="../" style="color:inherit;text-decoration:none">← Galley home</a>',
    ),
);

const markdown = markdownit({ html: false, linkify: true, typographer: true });
// Preserve the privacy policy's internal section links.
markdown.renderer.rules.heading_open = (tokens, index, options, _env, renderer) => {
  const title = tokens[index + 1].content;
  tokens[index].attrSet(
    'id',
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-'),
  );
  return renderer.renderToken(tokens, index, options);
};
const privacy = markdown.render(await readFile(`${root}PRIVACY.md`, 'utf8'));
await writeFile(
  `${out}/privacy.html`,
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#f5f4ed"><title>Privacy — Galley</title>
<meta name="description" content="How Galley handles documents, comments, permissions, and tokens. No Galley server, analytics, or telemetry.">
<link rel="icon" href="assets/icon.png"><link rel="stylesheet" href="styles.css"></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<header class="header wrap"><a class="brand" href="./"><img src="assets/icon.png" width="34" height="34" alt="">galley<span class="brand-dot">.</span></a><a class="text-link" href="./">Back to Galley <span aria-hidden="true">↗</span></a></header>
<main class="policy wrap" id="main">${privacy}</main>
<footer class="footer wrap"><a class="brand" href="./">galley<span class="brand-dot">.</span></a><nav aria-label="Footer navigation"><a href="./">Home</a><a href="https://github.com/m9rc1n/galley">Source ↗</a></nav></footer></body></html>`,
);
await writeFile(`${out}/.nojekyll`, '');
console.log('Galley website built → dist/site (landing page, live demo, privacy policy)');
