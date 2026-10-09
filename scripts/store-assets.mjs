// Renders the store, README and website graphics into store/assets/:
//   real reader captures (reader-*.jpg, 2× for sharp screens) taken from the demo, then the artwork
//   that frames them (captioned store screenshots, before/after) and the typeset promo art.
//   npm run store-assets        (uses Chrome from CHROME_PATH, or the usual install locations)
import { existsSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { ARTWORK, artworkHtml } from './artwork.mjs';
import { startDemoServer } from './serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}store/assets`;

function findChrome() {
  const cache = `${homedir()}/.cache/puppeteer/chrome`;
  const cached = existsSync(cache)
    ? readdirSync(cache)
        .sort()
        .reverse()
        .map((v) => `${cache}/${v}/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`)
    : [];
  const found = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ...cached,
  ].find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium executable.');
  return found;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const server = await startDemoServer(0);
const base = `http://localhost:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true });

/**
 * Open the demo with the given reader settings, optionally scroll to a heading or paragraph, open a
 * menu, and run `act` in the page (inside the reader's shadow root) before the capture.
 */
async function readerShot({ settings, doc = 0, heading, offset = 110, menu, act, scale = 2 }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: scale });
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: settings.appearance === 'dark' ? 'dark' : 'light' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  await page.goto(`${base}/?closed`);
  await page.evaluate((s) => {
    localStorage.setItem('galley:settings', JSON.stringify(s));
    sessionStorage.clear();
  }, settings);
  await page.goto(`${base}/?doc=${doc}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot?.querySelector('.mr-content'));
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
  if (heading) {
    await page.evaluate(
      (text, offset) => {
        const s = document.querySelector('#galley-reader').shadowRoot;
        const el = [...s.querySelectorAll('.mr-content :is(h1, h2, h3, p, li), .mr-title')].find((h) => h.textContent.trim().startsWith(text));
        const scroller = s.querySelector('.mr-root');
        scroller.scrollTop += el.getBoundingClientRect().top - offset;
      },
      heading,
      offset,
    );
    await sleep(400);
  }
  if (menu) await page.evaluate((name) => document.querySelector('#galley-reader').shadowRoot.querySelector(`[data-act="${name}"]`).click(), menu);
  if (act) {
    await page.evaluate(act);
    await sleep(500);
  }
  await page.waitForFunction(
    () =>
      [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('img')]
        .filter((img) => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        })
        .every((img) => img.complete),
    { timeout: 8000 },
  );
  await sleep(800);
  return page;
}

async function save(page, name, type = 'jpeg') {
  await page.screenshot({ path: `${out}/${name}`, type, ...(type === 'jpeg' ? { quality: 86 } : {}) });
  await page.close();
  console.log(`  ${name}`);
}

/** In the page: point at the block holding `text`, choose its comment control and write a draft. */
function draftComment(text, comment) {
  return `(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const block = [...s.querySelectorAll('.mr-content :is(p, li, .mr-code-line, .mr-tight)')].find((el) => el.textContent.includes(${JSON.stringify(text)}));
    block.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    s.querySelector('[data-act="comment-block"]').click();
    const area = s.querySelector('.mr-composer textarea');
    area.value = ${JSON.stringify(comment)};
    area.dispatchEvent(new Event('input', { bubbles: true }));
  })()`;
}

const light = { theme: 'sage', appearance: 'light', font: 'galley', size: 2, mode: 'changes', layout: 'balanced' };
console.log('store/assets/');
await save(await readerShot({ settings: light }), 'reader-changes.jpg');

const entry = await browser.newPage();
await entry.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
await entry.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await entry.goto(`${base}/?closed`, { waitUntil: 'networkidle0' });
await entry.waitForFunction(() => document.querySelector('#galley-launcher') && document.querySelectorAll('#diff tr').length > 10);
await sleep(600);
await save(entry, 'reader-diff.jpg');

await save(
  await readerShot({
    settings: light,
    heading: 'Most of our design work',
    offset: 260,
    act: draftComment('Reviewers see the source', 'This is the paragraph that sold me. Can we lead with it?'),
  }),
  'reader-comments.jpg',
);
await save(
  await readerShot({
    settings: { ...light, codeFiles: true },
    doc: 3,
    heading: 'src/review',
    offset: 96,
    act: draftComment('includeCodeFiles', 'Should code files stay off for first-time reviewers?'),
  }),
  'reader-code.jpg',
);
await save(await readerShot({ settings: light, heading: 'A small browser extension' }), 'reader-tables.jpg');
await save(await readerShot({ settings: light, doc: 1, heading: 'Review sequence' }), 'reader-diagram.jpg');
await save(await readerShot({ settings: { ...light, theme: 'night', appearance: 'dark', mode: 'clean' }, heading: 'Goals' }), 'reader-dark.jpg');
await save(await readerShot({ settings: { ...light, theme: 'sepia' }, heading: 'A small browser extension', menu: 'settings' }), 'reader-settings.jpg');

// Artwork, including the captioned store screenshots and the before/after, built from the captures above.
for (const artwork of ARTWORK) {
  const page = await browser.newPage();
  await page.setViewport({ width: artwork.width, height: artwork.height, deviceScaleFactor: 1 });
  await page.setContent(await artworkHtml(artwork), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await save(page, artwork.name, artwork.type);
}

await copyFile(`${root}src/icons/icon128.png`, `${out}/icon-128.png`);
console.log('  icon-128.png');
await browser.close();
server.close();
