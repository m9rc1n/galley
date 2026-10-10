import assert from 'node:assert/strict';
import { join } from 'node:path';

/**
 * The repository reader on the demo handbook (?repo): reading at one commit, following links and coming
 * back to the same paragraph, the documents list, the project map with its evidence, and phone layouts.
 */
export async function checkRepository(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const click = (selector, text) =>
    inspect(
      (selector, text) => {
        const s = document.querySelector('#galley-repo-reader').shadowRoot;
        const el = [...s.querySelectorAll(selector)].find((candidate) => !text || candidate.textContent.includes(text));
        el.click();
      },
      selector,
      text,
    );
  const settled = () =>
    page.waitForFunction(() => {
      const s = document.querySelector('#galley-repo-reader')?.shadowRoot;
      return s && !s.querySelector('.mr-doc .mr-skeleton');
    });
  const title = () =>
    inspect(() => document.querySelector('#galley-repo-reader').shadowRoot.querySelector('.mr-repo-read:not([hidden]) .mr-lead')?.textContent);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
    { name: 'prefers-color-scheme', value: 'light' },
  ]);
  await page.goto(`${demoUrl}/?closed&repo`, { waitUntil: 'networkidle0' });
  await inspect(() => localStorage.setItem('galley:settings', JSON.stringify({ theme: 'sage', appearance: 'light' })));
  // A repository page offers Read docs, with no count: nothing is fetched until it is chosen.
  const launcher = await inspect(() => {
    const s = document.querySelector('#galley-launcher').shadowRoot;
    return { label: s.querySelector('.label').textContent, count: getComputedStyle(s.querySelector('.count')).display };
  });
  assert.deepEqual(launcher, { label: 'Read docs', count: 'none' });
  await inspect(() => document.querySelector('#galley-launcher').shadowRoot.querySelector('.launch').click());
  await settled();
  assert.equal(await title(), 'Acme Handbook');
  const snapshot = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    return {
      at: s.querySelector('.mr-repo-at').textContent,
      commit: s.querySelector('.mr-repo-commit-label').textContent,
      marks: s.querySelectorAll('[data-mr-change], .mr-comment-btn').length,
      overflow: document.querySelector('#galley-repo-reader').shadowRoot.querySelector('.mr-root').scrollWidth > innerWidth,
    };
  });
  assert.deepEqual(snapshot, { at: 'README.md · main @ 4f2c9e1', commit: '4f2c9e1', marks: 0, overflow: false });

  // A relative link opens the document here, at the same commit, with its contents and its diagram.
  await click('.mr-content p a', 'architecture overview');
  await settled();
  assert.equal(await title(), 'Architecture overview');
  await page.waitForFunction(() => document.querySelector('#galley-repo-reader').shadowRoot.querySelector('.mr-diagram-view')?.dataset.state === 'ready');
  const overview = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    const toc = s.querySelector('.mr-toc').getBoundingClientRect();
    const article = s.querySelector('.mr-article').getBoundingClientRect();
    return {
      toc: [...s.querySelectorAll('.mr-toc a')].map((a) => a.textContent),
      tocLeftOfText: toc.right <= article.left,
      back: s.querySelector('[data-act="back"]').disabled,
    };
  });
  assert.deepEqual(overview, { toc: ['Receiving changes', 'Rendering', 'Operating it'], tocLeftOfText: true, back: false });
  await page.screenshot({ path: join(screenshots, 'repo-read-desktop.png') });

  // Back returns to the paragraph the reader left, not to the top.
  await click('.mr-content a', 'RFC 0042');
  await settled();
  const left = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    const root = s.querySelector('.mr-root');
    const design = [...s.querySelectorAll('.mr-content p')].find((p) => p.textContent.startsWith('Documents are rendered'));
    root.scrollTo({ top: root.scrollTop + design.getBoundingClientRect().top - 300 });
    return design.getBoundingClientRect().top;
  });
  await click('.mr-content a', 'ADR 0007');
  await settled();
  assert.equal(await title(), 'ADR 0007: Render Markdown in the browser');
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Alt');
  await settled();
  const back = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    return [...s.querySelectorAll('.mr-content p')].find((p) => p.textContent.startsWith('Documents are rendered')).getBoundingClientRect().top;
  });
  assert.ok(Math.abs(back - left) < 4, `Back should restore the paragraph at ${left}px, found it at ${back}px`);

  // The documents list: an outline of folders, searchable from the keyboard.
  await page.keyboard.press('/');
  const list = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    return {
      focused: s.activeElement === s.querySelector('.mr-repo-search'),
      folders: [...s.querySelectorAll('.mr-repo-folder > summary')].map((el) => el.textContent),
      meta: s.querySelector('.mr-files-meta').textContent,
    };
  });
  assert.deepEqual(list, {
    focused: true,
    folders: ['docs/', 'adr/', 'architecture/', 'guides/', 'rfcs/', 'runbooks/'],
    meta: 'main · 4f2c9e1 · 9 documents',
  });
  await page.keyboard.type('deploy');
  await page.waitForFunction(() => document.querySelector('#galley-repo-reader').shadowRoot.querySelectorAll('.mr-repo-results .mr-menu-item').length === 1);
  await click('.mr-repo-results .mr-menu-item');
  await settled();
  assert.equal(await title(), 'Deploying the service');

  // The map: the document in the middle, what links to it and what it links to, with the evidence.
  await page.keyboard.press('m');
  await page.waitForFunction(() =>
    /^Built from all 9/.test(document.querySelector('#galley-repo-reader').shadowRoot.querySelector('.mr-map-status')?.textContent ?? ''),
  );
  await click('.mr-repo-map .mr-repo-edge-doc', 'Architecture overview');
  const map = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    const [from, to] = [...s.querySelectorAll('.mr-map-col')].map((col) => col.getBoundingClientRect());
    const center = s.querySelector('.mr-map-center').getBoundingClientRect();
    return {
      title: s.querySelector('.mr-map-title').textContent,
      folder: s.querySelector('.mr-map-crumbs').textContent,
      counts: [...s.querySelectorAll('.mr-map-col h3')].map((h) => h.textContent),
      columns: from.right <= center.left && center.right <= to.left,
    };
  });
  assert.deepEqual(map, { title: 'Architecture overview', folder: 'In docs/architecture/', counts: ['Linked from (5)', 'Links to (4)'], columns: true });
  await page.screenshot({ path: join(screenshots, 'repo-map-desktop.png') });
  await click('.mr-map-col .mr-repo-proof', 'deploy runbook');
  await settled();
  assert.equal(await title(), 'Architecture overview');
  const flashed = await inspect(() =>
    [...document.querySelector('#galley-repo-reader').shadowRoot.querySelectorAll('.mr-content p')].some(
      (p) => p.classList.contains('mr-repo-flash') && p.textContent.includes('deploy runbook'),
    ),
  );
  assert.ok(flashed, 'Evidence opens the paragraph that holds the link');

  // A link to a document or section that does not exist is named in the map, never drawn.
  await click('.mr-repo-backlinks .mr-repo-edge-doc', 'RFC 0042');
  await settled();
  await page.keyboard.press('m');
  const problems = await inspect(() =>
    [...document.querySelector('#galley-repo-reader').shadowRoot.querySelectorAll('.mr-map-problems li')].map((li) => li.textContent),
  );
  assert.deepEqual(problems, [
    'RFC 0041 line 15: docs/rfcs/0041-diff-annotations.md is not among the listed documents.',
    'architecture overview line 19: “rendering-pipeline” is not a section of docs/architecture/overview.md.',
  ]);

  // Phones: one column, the document in the middle comes first, and nothing scrolls sideways.
  await page.setViewport({ width: 390, height: 844 });
  const phone = await inspect(() => {
    const s = document.querySelector('#galley-repo-reader').shadowRoot;
    const root = s.querySelector('.mr-root');
    const center = s.querySelector('.mr-map-center').getBoundingClientRect();
    const first = s.querySelector('.mr-map-col').getBoundingClientRect();
    return {
      overflow: root.scrollWidth > innerWidth,
      centerFirst: center.bottom <= first.top,
      name: s.querySelector('.mr-file-name').getBoundingClientRect().width,
      forward: getComputedStyle(s.querySelector('[data-act="forward"]')).display,
    };
  });
  assert.equal(phone.overflow, false);
  assert.equal(phone.centerFirst, true);
  assert.ok(phone.name > 60, `The document name needs room on a phone, had ${phone.name}px`);
  assert.equal(phone.forward, 'none');
  await page.screenshot({ path: join(screenshots, 'repo-map-mobile.png') });
  await page.keyboard.press('m');
  await settled();
  assert.equal(await inspect(() => document.querySelector('#galley-repo-reader').shadowRoot.querySelector('.mr-root').scrollWidth > innerWidth), false);
  await page.screenshot({ path: join(screenshots, 'repo-read-mobile.png') });

  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-repo-reader')), null);
  assert.deepEqual(errors, []);
  await page.close();
}
