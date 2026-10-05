// Renders the Chrome Web Store graphics from the real reader (via the demo) into store/assets/:
//   5 screenshots (1280×800 JPEG), small promo tile (440×280), marquee (1400×560), store icon (128×128 PNG).
//   npm run store-assets        (uses Chrome from CHROME_PATH, or the usual install locations)
import { existsSync, readdirSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { iconSvg } from './icons.mjs';
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

const ICON = iconSvg();

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
  await sleep(300);
  if (heading) {
    await page.evaluate((text) => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      const el = [...s.querySelectorAll('.mr-content h1, .mr-content h2, .mr-content h3, .mr-content p')].find((h) => h.textContent.startsWith(text));
      const scroller = s.querySelector('.mr-root');
      scroller.scrollTop += el.getBoundingClientRect().top - 100;
    }, heading);
    await sleep(300);
    // Scrolling down hides the top bar, as on Medium; show it in the picture.
    await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-topbar').classList.remove('is-hidden'));
  }
  if (menu) await page.evaluate((act) => document.querySelector('#galley-reader').shadowRoot.querySelector(`[data-act="${act}"]`).click(), menu);
  await page.waitForFunction(
    () =>
      [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('img')]
        .filter((img) => img.getBoundingClientRect().top < innerHeight)
        .every((img) => img.complete),
    { timeout: 5000 },
  );
  await sleep(700);
  return page;
}

async function save(page, name) {
  await page.screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 92 });
  await page.close();
  console.log(`  ${name}`);
}

const light = { theme: 'light', font: 'serif', size: 2, mode: 'changes' };
console.log('store/assets/');
await save(await readerShot({ settings: light }), 'screenshot-1-changes.jpg');

const entry = await browser.newPage();
await entry.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await entry.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
await entry.goto(`${base}/?closed`, { waitUntil: 'networkidle0' });
await entry.waitForFunction(() => document.querySelector('#galley-launcher') && document.querySelectorAll('#diff tr').length > 10);
await sleep(600);
await save(entry, 'screenshot-2-entry.jpg');

await save(await readerShot({ settings: light, heading: 'How it works' }), 'screenshot-3-tables.jpg');
await save(await readerShot({ settings: { ...light, theme: 'dark', mode: 'clean' }, heading: 'Goals' }), 'screenshot-4-clean-dark.jpg');

await save(await readerShot({ settings: { ...light, theme: 'sepia' }, heading: 'Paragraphs are matched', menu: 'settings' }), 'screenshot-5-sepia-settings.jpg');

// Promo tiles: HTML templates with the icon and, for the marquee, a sharp 2× capture of the reader.
const hero = await readerShot({ settings: light, scale: 2 });
const shot = `data:image/jpeg;base64,${Buffer.from(await hero.screenshot({ type: 'jpeg', quality: 90 })).toString('base64')}`;
await hero.close();
for (const [template, name, width, height] of [
  ['promo-small.html', 'promo-small-440x280.jpg', 440, 280],
  ['promo-marquee.html', 'promo-marquee-1400x560.jpg', 1400, 560],
]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const html = (await readFile(`${root}store/templates/${template}`, 'utf8')).replace('{{ICON}}', ICON).replace('{{SHOT}}', shot);
  await page.setContent(html, { waitUntil: 'load' });
  await sleep(300);
  await save(page, name);
}

await copyFile(`${root}src/icons/icon128.png`, `${out}/icon-128.png`);
console.log('  icon-128.png');
await browser.close();
server.close();
