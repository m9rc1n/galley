// Screenshots of the real reader in the demo, for checking a UI change by eye.
//   npm run screenshots                       1440, 1100 and 390 pixels; light and dark; Sage; plus the settings sheet
//   npm run screenshots -- --widths 1440,390 --palettes sage,contrast --appearances dark --demo large
//   npm run screenshots -- --help
// Builds the demo first (--no-build skips it), serves it locally and writes PNGs to reports/screenshots/.
// CHROME_PATH chooses the browser. Nothing is sent anywhere; the demo never posts to GitHub or GitLab.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';
import { startDemoServer } from './serve.mjs';

const root = new URL('..', import.meta.url).pathname;
const read = (pattern) => [...(pattern.exec(readFileSync(join(root, 'src/ui/settings.ts'), 'utf8'))?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map(([, id]) => id);
const PALETTES = read(/export const THEMES = \[([\s\S]*?)\] as const/);
const LAYOUTS = read(/export const LAYOUTS = \[([\s\S]*?)\] as const/);
const DEMOS = ['default', 'large', 'spec', 'comments', 'chapters', 'code-only', 'diagram-error'];
const HELP = `Screenshots of the reader in the demo.

  --widths 1440,1100,390      viewport widths in pixels
  --height 900                viewport height in pixels
  --palettes sage             any of: ${PALETTES.join(', ')}
  --appearances light,dark    light, dark
  --layout balanced           any of: ${LAYOUTS.join(', ')}
  --density comfortable       comfortable, compact
  --size 2                    text size, 0 (17 px) to 4 (24 px)
  --demo default              any of: ${DEMOS.join(', ')}
  --code                      turn on Code files
  --clean                     Clean mode (no change marks)
  --scroll 0                  scroll the reader this many pixels before capturing
  --no-settings               skip the settings sheet capture
  --scale 1                   device pixel ratio (2 for crisp images)
  --out reports/screenshots   where PNGs go
  --no-build                  use the demo build as it is`;

const { values: opt } = parseArgs({
  options: {
    widths: { type: 'string', default: '1440,1100,390' },
    height: { type: 'string', default: '900' },
    palettes: { type: 'string', default: 'sage' },
    appearances: { type: 'string', default: 'light,dark' },
    layout: { type: 'string', default: 'balanced' },
    density: { type: 'string', default: 'comfortable' },
    size: { type: 'string', default: '2' },
    demo: { type: 'string', default: 'default' },
    code: { type: 'boolean', default: false },
    clean: { type: 'boolean', default: false },
    scroll: { type: 'string', default: '0' },
    'no-settings': { type: 'boolean', default: false },
    scale: { type: 'string', default: '1' },
    out: { type: 'string', default: 'reports/screenshots' },
    'no-build': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});
if (opt.help) {
  console.log(HELP);
  process.exit(0);
}

const list = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const widths = list(opt.widths).map(Number);
const palettes = list(opt.palettes);
const appearances = list(opt.appearances);
const fail = (message) => {
  console.error(`${message}\n\n${HELP}`);
  process.exit(1);
};
if (!widths.length || widths.some((width) => !Number.isInteger(width) || width < 280)) fail('--widths takes whole numbers of at least 280.');
for (const palette of palettes) if (!PALETTES.includes(palette)) fail(`Unknown palette "${palette}".`);
for (const appearance of appearances) if (!['light', 'dark'].includes(appearance)) fail(`Unknown appearance "${appearance}".`);
if (!LAYOUTS.includes(opt.layout)) fail(`Unknown layout "${opt.layout}".`);
if (!['comfortable', 'compact'].includes(opt.density)) fail(`Unknown density "${opt.density}".`);
if (!DEMOS.includes(opt.demo)) fail(`Unknown demo "${opt.demo}".`);

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache', 'puppeteer', 'chrome');
  const testing = existsSync(cache)
    ? readdirSync(cache).flatMap((version) => [
        join(cache, version, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        join(cache, version, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        join(cache, version, 'chrome-linux64', 'chrome'),
      ])
    : [];
  const found = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...testing,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    ...(process.env.PLAYWRIGHT_BROWSERS_PATH ? [join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium')] : []),
  ].find((path) => existsSync(path));
  if (!found) fail('No Chrome found. Install Chrome or set CHROME_PATH.');
  return found;
}

if (!opt['no-build']) execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
const out = join(root, opt.out);
await mkdir(out, { recursive: true });

const server = await startDemoServer(0);
const base = `http://127.0.0.1:${server.address().port}/${opt.demo === 'default' ? '' : `?${opt.demo}`}`;
// Headless Chrome on Linux reports no pointing device; these screenshots are of a desktop with a mouse, as in e2e/.
const MOUSE = '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2';
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox', MOUSE] });
const saved = [];
try {
  for (const palette of palettes) {
    for (const appearance of appearances) {
      const settings = {
        theme: palette,
        appearance,
        layout: opt.layout,
        density: opt.density,
        size: Number(opt.size),
        codeFiles: opt.code,
        mode: opt.clean ? 'clean' : 'changes',
      };
      for (const [i, width] of widths.entries()) {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.setViewport({ width, height: Number(opt.height), deviceScaleFactor: Number(opt.scale) });
        await page.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'reduce' },
          { name: 'prefers-color-scheme', value: appearance },
        ]);
        // The demo keeps settings in localStorage, under the same key as the extension. Sandboxed frames have none.
        await page.evaluateOnNewDocument((value) => {
          if (window === window.top) localStorage.setItem('galley:settings', JSON.stringify(value));
        }, settings);
        await page.goto(base, { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot?.querySelector('[data-document] .mr-content'), {
          timeout: 20_000,
        });
        await page.waitForFunction(() => [...document.fonts].every((face) => face.status !== 'loading'));
        // Let lazily loaded files, diagrams and syntax colours settle.
        await page
          .waitForFunction(
            () => ![...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-skeleton')].some((el) => el.getClientRects().length),
            { timeout: 10_000 },
          )
          .catch(() => {});
        await page.evaluate((y) => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').scrollTo(0, y), Number(opt.scroll));
        await new Promise((resolve) => setTimeout(resolve, 400));
        const name = `${opt.demo}-${palette}-${appearance}-${width}`;
        const file = join(out, `${name}.png`);
        await page.screenshot({ path: file });
        saved.push(file);
        if (!opt['no-settings'] && i === 0) {
          await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="settings"]').click());
          await new Promise((resolve) => setTimeout(resolve, 300));
          const sheet = join(out, `${name}-settings.png`);
          await page.screenshot({ path: sheet });
          saved.push(sheet);
        }
        if (errors.length) console.warn(`Page errors at ${name}:\n  ${errors.join('\n  ')}`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`Saved ${saved.length} screenshots:\n${saved.map((file) => `  ${file.replace(root, '')}`).join('\n')}`);
