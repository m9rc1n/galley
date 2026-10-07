// Renders the Chrome Web Store graphics from the real reader (via the demo) into store/assets/:
//   5 real screenshots, two mission promo tiles, a README hero, and the store icon.
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

/** Open the demo with the given reader settings, optionally scroll to a heading and open a menu. */
async function readerShot({ settings, doc = 0, heading, menu, scale = 1 }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: scale });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: settings.theme === 'dark' ? 'dark' : 'light' }]);
  await page.goto(`${base}/?closed`);
  await page.evaluate((s) => localStorage.setItem('galley:settings', JSON.stringify(s)), settings);
  await page.goto(`${base}/?doc=${doc}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot?.querySelector('.mr-content'));
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  if (heading) {
    await page.evaluate((text) => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      const el = [...s.querySelectorAll('.mr-content h1, .mr-content h2, .mr-content h3, .mr-content p')].find((h) => h.textContent.startsWith(text));
      const scroller = s.querySelector('.mr-root');
      scroller.scrollTop += el.getBoundingClientRect().top - 100;
    }, heading);
    await sleep(300);
  }
  if (menu) await page.evaluate((act) => document.querySelector('#galley-reader').shadowRoot.querySelector(`[data-act="${act}"]`).click(), menu);
  await page.waitForFunction(
    () =>
      [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('img')]
        .filter((img) => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        })
        .every((img) => img.complete),
    { timeout: 5000 },
  );
  await sleep(700);
  return page;
}

async function save(page, name, type = 'jpeg') {
  await page.screenshot({ path: `${out}/${name}`, type, ...(type === 'jpeg' ? { quality: 92 } : {}) });
  await page.close();
  console.log(`  ${name}`);
}

const light = { theme: 'light', font: 'serif', size: 1, mode: 'changes' };
console.log('store/assets/');
await save(await readerShot({ settings: light }), 'screenshot-1-changes.jpg');

const entry = await browser.newPage();
await entry.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await entry.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await entry.goto(`${base}/?closed`, { waitUntil: 'networkidle0' });
await entry.waitForFunction(() => document.querySelector('#galley-launcher') && document.querySelectorAll('#diff tr').length > 10);
await sleep(600);
await save(entry, 'screenshot-2-entry.jpg');

await save(await readerShot({ settings: light, heading: 'A small browser extension' }), 'screenshot-3-tables.jpg');
await save(await readerShot({ settings: { ...light, theme: 'dark', mode: 'clean' }, heading: 'Goals' }), 'screenshot-4-clean-dark.jpg');

await save(await readerShot({ settings: { ...light, theme: 'sepia' }, heading: 'A small browser extension', menu: 'settings' }), 'screenshot-5-sepia-settings.jpg');

// The mission illustration is separate from real product screenshots, shared with the README.
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
