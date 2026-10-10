// The shipped extension, with platform responses intercepted: no live repository is read or written.
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

export async function checkOpening(executablePath, screenshots) {
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, enableExtensions: [resolve('dist/chrome')], args: ['--no-sandbox'] });
  try {
    const workerTarget = await browser.waitForTarget((target) => target.type() === 'service_worker' && target.url().startsWith('chrome-extension://'));
    const extension = `chrome-extension://${new URL(workerTarget.url()).host}`;
    const settings = await browser.newPage();
    await settings.goto(`${extension}/options.html`);
    await settings.waitForSelector('#read-button:enabled');
    assert.equal(await settings.$eval('#read-button', (control) => control.checked), true);
    for (const appearance of ['light', 'dark']) {
      await settings.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: appearance }]);
      for (const width of [1440, 390]) {
        await settings.setViewport({ width, height: 900 });
        assert.equal(await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await settings.screenshot({ path: join(screenshots, `opening-settings-${appearance}-${width}.png`) });
      }
    }
    await settings.click('#read-button');
    await settings.waitForFunction(() => document.querySelector('#status').textContent.includes('button is off'));
    console.log('Opening: page-button choice saved.');
    const commands = await settings.evaluate(() => chrome.commands.getAll());
    assert.equal(
      commands.some((command) => command.name === 'read-page' && command.description === 'Read this page in Galley'),
      true,
    );

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const requests = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol === 'chrome-extension:' || url.protocol === 'data:') return void request.continue();
      if (request.isNavigationRequest()) {
        const attributes = url.hostname === 'gitlab.com' ? ' data-project-full-path="team/repo" data-project-id="7"' : '';
        return void request.respond({
          status: 200,
          contentType: 'text/html',
          body: `<!doctype html><html lang="en"><title>Example project</title><body${attributes}><h1>Example project</h1></body></html>`,
        });
      }
      if (!url.pathname.startsWith('/api/')) return void request.respond({ status: 404, body: '' });
      requests.push(url.pathname);
      let body;
      if (url.pathname.endsWith('/merge_requests/1'))
        body = { iid: 1, title: 'Update guide', description: '', diff_refs: { base_sha: 'a'.repeat(40), head_sha: 'b'.repeat(40), start_sha: 'a'.repeat(40) } };
      else if (url.pathname.endsWith('/diffs'))
        body = [{ old_path: 'README.md', new_path: 'README.md', new_file: true, deleted_file: false, renamed_file: false }];
      else if (url.pathname.endsWith('/discussions')) body = [];
      else if (url.pathname.endsWith('/repository/commits/HEAD')) body = { id: 'b'.repeat(40) };
      else if (url.pathname.endsWith('/repository/tree')) body = [{ path: 'README.md', type: 'blob' }];
      else if (url.pathname.endsWith('/raw'))
        return void request.respond({ status: 200, contentType: 'text/plain', body: '# A focused review\n\nRead the changes when you are ready.\n' });
      else return void request.respond({ status: 404, contentType: 'application/json', body: '{}' });
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const currentTab = () => settings.evaluate(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id);
    const state = (id) => settings.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'galley:page-state' }), id);
    const open = (id) => settings.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'galley:open-reader' }), id);
    const visit = async (url) => {
      await page.goto(url, { waitUntil: 'networkidle0' });
      await page.bringToFront();
      const id = await currentTab();
      await state(id);
      assert.equal(await page.$('#galley-launcher'), null);
      return id;
    };
    const review = await visit('https://gitlab.com/team/repo/-/merge_requests/1');
    assert.equal(requests.length, 0, 'The disabled page button must make no platform requests');
    assert.deepEqual(await state(review), { kind: 'review', label: 'Merge request !1 in team/repo' });
    console.log('Opening: review page stays quiet.');
    await settings.evaluate(() => chrome.action.openPopup());
    const popupTarget = await browser.waitForTarget((target) => target.url() === `${extension}/popup.html`);
    const popup = await popupTarget.asPage();
    await popup.waitForSelector('#reader button');
    assert.equal(await popup.$eval('#reader button', (button) => button.textContent), 'Read this review');
    assert.equal(requests.length, 0, 'Opening the popup must not fetch review content');
    const readerSpacing = await popup.$eval('#reader', (section) => {
      const button = section.querySelector('button').getBoundingClientRect();
      const label = section.querySelector('p').getBoundingClientRect();
      return { gap: label.top - button.bottom, height: button.height };
    });
    assert.ok(readerSpacing.gap >= 12, `The page label needs breathing room below Read: ${JSON.stringify(readerSpacing)}`);
    assert.ok(readerSpacing.height >= 44, 'The Read action must remain easy to click');
    for (const appearance of ['light', 'dark']) {
      await popup.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: appearance }]);
      assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'The toolbar must not scroll sideways');
      await popup.screenshot({ path: join(screenshots, `opening-popup-review-${appearance}.png`) });
    }
    await popup.screenshot({ path: join(screenshots, 'opening-popup-review.png') });
    await popup.$eval('#reader button', (button) => button.click());
    console.log('Opening: toolbar action chosen.');
    await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelector('.mr-content h1'));
    assert.equal(
      requests.some((path) => path.endsWith('/diffs')),
      true,
    );
    assert.equal(
      await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-content h1').textContent),
      'A focused review',
    );
    const count = requests.length;
    console.log('Opening: review reader loaded.');
    await open(review);
    assert.equal(requests.length, count, 'Opening again must keep the same reader');
    await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="close"]').click());

    requests.length = 0;
    const repository = await visit('https://gitlab.com/team/repo');
    assert.equal(requests.length, 0);
    assert.deepEqual(await state(repository), { kind: 'repository', label: 'team/repo' });
    console.log('Opening: repository page stays quiet.');
    await open(repository);
    console.log('Opening: repository action chosen.', requests);
    await page.waitForFunction(() => document.querySelector('#galley-repo-reader')?.shadowRoot.querySelector('.mr-lead')?.textContent === 'A focused review');
    assert.equal(
      requests.some((path) => path.endsWith('/repository/tree')),
      true,
    );
    console.log('Opening: repository reader loaded.');
    await page.evaluate(() => document.querySelector('#galley-repo-reader').shadowRoot.querySelector('[data-act="close"]').click());

    const longRepository = `acme/${'architecture'.repeat(6)}`;
    const github = await visit(`https://github.com/${longRepository}`);
    assert.deepEqual(await state(github), { kind: 'repository', label: longRepository });
    await settings.evaluate(() => chrome.action.openPopup());
    const githubPopupTarget = await browser.waitForTarget((target) => target.url() === `${extension}/popup.html`);
    const githubPopup = await githubPopupTarget.asPage();
    await githubPopup.waitForSelector('#reader button');
    await githubPopup.waitForSelector('#token-form', { visible: true });
    assert.equal(await githubPopup.$eval('#reader button', (button) => button.textContent), 'Read the project');
    assert.equal(
      await githubPopup.$eval('#reader p', (label) => label.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(label).lineHeight)),
      true,
      'Long repository names must wrap rather than crowd the action or scroll sideways',
    );
    for (const appearance of ['light', 'dark']) {
      await githubPopup.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: appearance }]);
      assert.equal(await githubPopup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(
        await githubPopup.$eval('#settings', (button) => button.getBoundingClientRect().bottom <= innerHeight),
        true,
        'Settings must be visible without scrolling through the token form',
      );
      assert.equal(
        await githubPopup.$$eval('#token-form input, #token-form button', (controls) =>
          controls.every((control) => control.getBoundingClientRect().height >= 44),
        ),
        true,
        'The token field and Save token action need comfortable targets',
      );
      await githubPopup.screenshot({ path: join(screenshots, `opening-popup-github-${appearance}.png`) });
    }
    await githubPopup.evaluate(() => window.close());
    await visit('https://gitlab.com/team/repo');
    await settings.bringToFront();
    await settings.click('#read-button');
    await settings.waitForFunction(() => document.querySelector('#status').textContent === 'The Read button is on.');
    await page.waitForSelector('#galley-launcher');
    assert.deepEqual(errors, []);
    console.log(
      'Opening checks passed: built extension settings, light/dark desktop/mobile layout, no eager requests, real toolbar popup, both readers, preserved reader, live page-button changes and registered shortcut.',
    );
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await browser.close();
  }
}
