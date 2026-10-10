import assert from 'node:assert/strict';
import { join } from 'node:path';

/** The real chapter dialog: keyboard focus, complete file accounting, state-preserving edits and phone layout. */
export async function checkChapters(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const click = (text) =>
    inspect((text) => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      [...s.querySelectorAll('.mr-chapters button')].find((el) => el.textContent === text).click();
    }, text);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
  await inspect(() => localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper', appearance: 'light', codeFiles: false })));
  await page.goto(`${demoUrl}/?chapters`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(
    () => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-document:not([hidden]) .mr-skeleton').length === 0,
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-chapters-toggle').focus());
  await page.keyboard.press('m');
  const initial = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      count: s.querySelectorAll('.mr-chapters [data-file]').length,
      progress: s.querySelector('.mr-chapters-progress').textContent,
      hiddenCode: s.querySelector('.mr-chapters [data-file="4"]').textContent,
      unsupported: s.querySelector('.mr-chapters a').getAttribute('href'),
      focused: s.activeElement.textContent,
      inert: s.querySelector('.mr-main').inert,
    };
  });
  assert.equal(initial.count, 13);
  assert.match(initial.progress, /0 explicitly viewed/);
  assert.match(initial.hiddenCode, /Code files off/);
  assert.match(initial.unsupported, /chapters/);
  assert.equal(initial.focused, 'Close');
  assert.equal(initial.inert, true);
  const cdp = await page.createCDPSession();
  const accessibility = await cdp.send('Accessibility.getFullAXTree');
  assert.ok(accessibility.nodes.some((node) => node.role?.value === 'dialog' && node.name?.value === 'Review chapters'));
  assert.ok(accessibility.nodes.some((node) => node.role?.value === 'button' && node.name?.value === 'Start here'));
  assert.ok(accessibility.nodes.some((node) => node.name?.value?.includes('0042-reading-first-reviews.md') && node.name.value.includes('Not viewed')));
  await cdp.detach();
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.textContent), 'Reset chapters');
  await page.keyboard.press('Tab');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.textContent), 'Close');
  await page.screenshot({ path: join(screenshots, 'galley-chapters-desktop.png') });

  await click('Start here');
  await page.waitForFunction(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return s.querySelector('.mr-document[data-document]').getBoundingClientRect().top < 150;
  });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-chapters-toggle').focus());
  await page.keyboard.press('m');

  // Chapter editing moves existing document nodes, and anchors the file at its former viewport position.
  const before = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const file = s.querySelector('.mr-document[data-document]');
    window.chapterFile = file;
    return file.getBoundingClientRect().top;
  });
  await click('Edit chapters');
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const chapter = s.querySelector('[data-chapter="docs:docs/rfcs"]');
    chapter.querySelector('input').value = 'Start with the intent';
    chapter.querySelector('input').dispatchEvent(new Event('input'));
    [...chapter.querySelectorAll('button')].find((el) => el.textContent === 'Later').click();
  });
  const after = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      retained: [...s.querySelectorAll('.mr-document')].includes(window.chapterFile),
      top: window.chapterFile.getBoundingClientRect().top,
      current: s.querySelector('.mr-chapters [aria-current]').textContent,
    };
  });
  assert.equal(after.retained, true);
  assert.ok(Math.abs(after.top - before) < 2, JSON.stringify({ before, after }));
  assert.match(after.current, /0042-reading/);
  await click('Done editing');
  await click('All files');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-chapters [data-file]').length), 13);
  await click('Chapter map');
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.classList.contains('mr-chapters-toggle')), true);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-main').inert), false);

  for (const [width, appearance] of [
    [1440, 'dark'],
    [390, 'light'],
    [320, 'dark'],
  ]) {
    await page.setViewport({ width, height: 844 });
    await inspect((appearance) => localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper', appearance, codeFiles: true })), appearance);
    await page.goto(`${demoUrl}/?chapters`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-skeleton').length === 0);
    await page.keyboard.press('m');
    const geometry = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      const panel = s.querySelector('.mr-chapters-panel');
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: panel.clientWidth,
        scroll: panel.scrollWidth,
        page: s.querySelector('.mr-root').scrollWidth,
        buttons: [...s.querySelectorAll('.mr-chapters-panel button')].filter((el) => el.getClientRects().length).map((el) => el.getBoundingClientRect().height),
        folded: [...s.querySelectorAll('.mr-chapter-file-state')].some((el) => el.textContent.includes('Folded')),
      };
    });
    assert.ok(
      geometry.left >= 0 && geometry.right <= width && geometry.scroll <= geometry.width && geometry.page <= width,
      JSON.stringify({ width, geometry }),
    );
    assert.equal(geometry.folded, true);
    if (width < 760)
      assert.ok(
        geometry.buttons.every((height) => height >= 44),
        JSON.stringify(geometry.buttons),
      );
    await page.screenshot({ path: join(screenshots, `galley-chapters-${width}-${appearance}.png`) });
    await click('Edit chapters');
    const editWidth = await inspect(() => {
      const panel = document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-chapters-panel');
      return { width: panel.clientWidth, scroll: panel.scrollWidth };
    });
    assert.ok(editWidth.scroll <= editWidth.width, JSON.stringify(editWidth));
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(errors, []);
  await page.close();
}
