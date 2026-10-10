// Verify the built Pages artifact, including relative routes at a repository subpath.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { checkSitePreview } from './site-preview.mjs';
import { startSiteServer } from '../scripts/serve-site.mjs';

const chrome =
  process.env.CHROME_PATH ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(
    (path) => existsSync(path),
  );
assert.ok(chrome, 'Chrome is required; set CHROME_PATH to its executable.');
await mkdir('reports/site', { recursive: true });
const server = await startSiteServer(0, '/galley');
const origin = `http://127.0.0.1:${server.address().port}`;
const storeUrl = 'https://chromewebstore.google.com/detail/galley-markdown-reader-fo/ccmihhdpegbhbijhahdanmcbbpoeneic';
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  const failures = [];
  const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => failures.push(request.url()));
  page.on('request', (request) => {
    if (!request.url().startsWith(origin) && !request.url().startsWith('data:') && !request.url().startsWith('blob:')) external.push(request.url());
  });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/galley/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  assert.ok(
    await page.evaluate(() => [...document.fonts].filter((font) => font.status === 'loaded').some((font) => font.family === 'Newsreader')),
    'The editorial webfont must load from the Pages artifact',
  );
  assert.ok(
    await page.evaluate(() => [...document.fonts].filter((font) => font.status === 'loaded').some((font) => font.family === 'DM Sans')),
    'The interface webfont must load from the Pages artifact',
  );
  assert.equal(await page.$eval('.hero-actions .button-primary', (button) => button.getAttribute('href')), storeUrl, 'Installation is the primary action');
  assert.ok(
    await page.$$eval('a.button-primary', (buttons, url) => buttons.every((button) => button.getAttribute('href') === url), storeUrl),
    'All primary install actions should lead to the published store listing',
  );
  assert.ok(
    await page.$eval('.install-steps', (steps) => steps.textContent.includes('Add to Chrome') && !steps.textContent.includes('Developer mode')),
    'Installation should use the Chrome Web Store',
  );
  assert.ok(await page.evaluate(() => !document.body.textContent.includes('coming soon')), 'Do not describe the published extension as coming soon');
  assert.equal(await page.$eval('.hero-actions .button-demo', (button) => button.getAttribute('href')), 'demo/', 'Demo should be a visible secondary action');
  await page.screenshot({ path: 'reports/site/desktop.png', fullPage: true });
  await page.screenshot({ path: 'reports/site/desktop-hero.png' });

  // Every local navigation link resolves inside the project path, every anchor has a target.
  const links = await page.$$eval('a[href]', (anchors) =>
    anchors.map((anchor) => ({
      raw: anchor.getAttribute('href'),
      url: anchor.href,
    })),
  );
  for (const link of links) {
    if (link.raw.startsWith('#')) {
      assert.ok(await page.evaluate((id) => Boolean(document.getElementById(id)), link.raw.slice(1)), `Missing anchor ${link.raw}`);
    } else if (link.url.startsWith(origin)) {
      assert.ok(link.url.startsWith(`${origin}/galley/`), `Escaped project path: ${link.url}`);
      assert.equal((await fetch(link.url)).status, 200, `Broken link: ${link.url}`);
    }
  }
  await page.click('[data-mode="clean"]');
  assert.equal(await page.$eval('#illustrated-reader del', (element) => getComputedStyle(element).display), 'none');
  assert.equal(await page.$eval('[data-mode="clean"]', (element) => element.getAttribute('aria-pressed')), 'true');
  await page.click('[data-mode="changes"]');
  assert.notEqual(await page.$eval('#illustrated-reader del', (element) => getComputedStyle(element).display), 'none');
  // The same change as a raw diff, in a card that keeps its size, so the page never jumps.
  const cardHeight = () => page.$eval('#illustrated-reader', (card) => card.getBoundingClientRect().height);
  const galleyHeight = await cardHeight();
  await page.click('[data-mode="diff"]');
  assert.equal(await page.$eval('.reader-diff', (diff) => getComputedStyle(diff).visibility), 'visible');
  assert.equal(await page.$eval('#illustrated-reader .reader-paper', (paper) => getComputedStyle(paper).visibility), 'hidden');
  assert.equal(await cardHeight(), galleyHeight, 'Switching modes keeps the illustrated card the same height');
  await page.click('[data-mode="changes"]');
  // Before / after: the divider follows the range input.
  await page.$eval('.compare-range', (range) => {
    range.value = '20';
    range.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(await page.$eval('.compare-frame', (frame) => frame.style.getPropertyValue('--split')), '20%');
  for (const preview of ['comments', 'code', 'tables', 'diagram', 'dark', 'changes']) {
    await page.click(`[data-preview="${preview}"]`);
    await page.waitForFunction(() => document.querySelector('#preview-image').complete && document.querySelector('#preview-image').naturalWidth > 0);
    assert.equal(await page.$$eval('[data-preview][aria-pressed="true"]', (buttons) => buttons.length), 1);
    assert.ok(await page.$eval('#preview-caption', (element) => element.textContent.length > 30));
  }
  await page.click('.faq summary');
  assert.equal(await page.$eval('.faq details', (element) => element.open), true);
  await page.click('.faq summary');
  // Layout checks cover the narrowest supported phone as well as desktop/tablet breakpoints.
  for (const width of [1440, 1100, 800, 768, 540, 390, 320]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
    assert.ok(
      await page.$$eval('.button', (buttons) => buttons.every((button) => button.getBoundingClientRect().height >= 38)),
      `Small action targets at ${width}px`,
    );
    assert.ok(
      await page.$eval('.header-demo', (link) => {
        const bounds = link.getBoundingClientRect();
        return bounds.width > 0 && bounds.left >= 0 && bounds.right <= innerWidth;
      }),
      `Demo must remain visible in the header at ${width}px`,
    );
    if (width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: 'reports/site/mobile.png',
        fullPage: true,
      });
      await page.screenshot({ path: 'reports/site/mobile-hero.png' });
    }
  }
  // The static page remains useful when JavaScript is disabled.
  await page.setJavaScriptEnabled(false);
  await page.goto(`${origin}/galley/`, { waitUntil: 'networkidle0' });
  assert.ok(await page.$('.hero-actions a[href="demo/"]'));
  await page.click('.faq summary');
  assert.equal(await page.$eval('.faq details', (element) => element.open), true);
  await page.setJavaScriptEnabled(true);

  await page.goto(`${origin}/galley/privacy.html`, {
    waitUntil: 'networkidle0',
  });
  assert.match(await page.$eval('h1', (element) => element.textContent), /privacy/i);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Privacy page overflow');
  assert.ok(
    await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every((link) => document.getElementById(link.hash.slice(1)))),
    'Privacy section links',
  );

  // A landing page demo link must run the real reader and its lazy engines on GitHub Pages.
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${origin}/galley/demo/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('[data-document] .mr-content').length === 3);
  assert.ok(await page.$('a.logo[href="../"]'), 'Demo should have a route home');
  await page.evaluate(() => {
    for (const button of document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-context-toggle')) button.click();
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-diagram img'));
  await page.screenshot({ path: 'reports/site/demo.png', fullPage: true });
  await page.setViewport({ width: 390, height: 900 });
  assert.ok(
    await page.evaluate(() => {
      const root = document.querySelector('#galley-reader').shadowRoot;
      return [...root.querySelectorAll('.mr-topbar button')]
        .filter((button) => button.getBoundingClientRect().width > 0)
        .every((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth;
        });
    }),
    'Live demo controls must fit on a phone',
  );
  await page.screenshot({ path: 'reports/site/demo-mobile.png' });
  await checkSitePreview(page, origin);
  assert.deepEqual(errors, [], 'Browser errors');
  assert.deepEqual(failures, [], 'Failed resources');
  assert.deepEqual(external, [], 'The website and demo should load without external requests');
  console.log('Website passed: desktop/mobile layouts, previews, FAQs, local links, privacy, no external requests, and live demo at /galley/.');
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
