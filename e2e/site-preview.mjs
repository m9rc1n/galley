import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { composePreviews, installPreview } from '../scripts/pages-previews.mjs';

/** Exercise the actual built demo and sandbox engines at its extra-deep Pages preview path. */
export async function checkSitePreview(page, origin) {
  const state = await mkdtemp(join(tmpdir(), 'galley-site-preview-'));
  try {
    await installPreview(state, 'dist/site/demo', { number: 999, sha: 'browser-check', run: 1 });
    await composePreviews(state, 'dist/site', new Set([999]));
    const url = `${origin}/galley/pr-preview/999/demo/`;
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('[data-document] .mr-content').length === 3);
    assert.match(await page.title(), /MR #999 demo/);
    const home = await page.$eval('a.logo', (link) => link.href);
    assert.equal(home, `${origin}/galley/`);
    assert.equal((await fetch(home)).status, 200);
    const icon = await page.$eval('link[rel="icon"]', (link) => link.href);
    assert.equal((await fetch(icon)).status, 200);
    await page.evaluate(() => {
      for (const button of document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-context-toggle')) button.click();
    });
    await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-diagram img'));
    await page.screenshot({ path: 'reports/site/mr-preview-desktop.png' });
    await page.setViewport({ width: 390, height: 900 });
    assert.ok(await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').scrollWidth <= innerWidth));
    await page.screenshot({ path: 'reports/site/mr-preview-mobile.png' });
    await composePreviews(state, 'dist/site', new Set());
    assert.equal((await fetch(url)).status, 404, 'Closing an MR removes its preview URL');
    assert.equal((await fetch(`${origin}/galley/demo/`)).status, 200, 'Cleanup retains the main demo');
  } finally {
    await rm(state, { recursive: true, force: true });
    await rm('dist/site/pr-preview', { recursive: true, force: true });
  }
}
