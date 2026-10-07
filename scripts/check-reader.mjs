// Exercise the actual shadow-DOM reader in Chrome. Start npm run demo first.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const screenshots = process.env.SCREENSHOT_DIR ?? tmpdir();
await mkdir(screenshots, { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(process.env.DEMO_URL ?? 'http://localhost:4173', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-content').length === 3);
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const initial = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return { files: [...s.querySelectorAll('.mr-document')].filter((el) => !el.hidden).length, nextButtons: s.querySelectorAll('.mr-next').length, filter: s.querySelector('[data-scope="changed"]').getAttribute('aria-pressed'), close: s.querySelector('[data-act="close"]').getAttribute('title'), hidden: s.querySelectorAll('.mr-content [hidden]').length, composer: s.querySelector('.mr-composer').hidden, threads: s.querySelectorAll('.mr-thread').length, rail: s.querySelectorAll('.mr-threads .mr-thread').length };
  });
  assert.equal(initial.files, 3); assert.equal(initial.nextButtons, 0); assert.equal(initial.filter, 'true'); assert.ok(initial.hidden > 0); assert.match(initial.close, /Esc/);
  // Nothing follows the reader around: the composer waits for an explicit target, threads sit in the margin.
  assert.equal(initial.composer, true); assert.equal(initial.threads, 3); assert.equal(initial.rail, 2);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')), 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')), 'false');
  await page.screenshot({ path: join(screenshots, 'galley-reader-desktop.png') });
  // Toolbar controls stay centred, ordered and within the viewport at every supported width.
  for (const width of [1440, 1100, 900, 768, 760, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    const aligned = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return [...s.querySelectorAll('.mr-topbar button')].filter((el) => el.getClientRects().length && !el.closest('[hidden]')).map((el) => {
        const r = el.getBoundingClientRect(); return { act: el.dataset.act, left: r.left, right: r.right, center: (r.top + r.bottom) / 2 };
      });
    });
    for (let i = 0; i < aligned.length; i++) {
      assert.ok(aligned[i].left >= 0 && aligned[i].right <= width, JSON.stringify({ width, aligned }));
      assert.ok(Math.abs(aligned[i].center - 26) < 1, JSON.stringify({ width, aligned }));
      if (i) assert.ok(aligned[i].left >= aligned[i - 1].right, JSON.stringify({ width, aligned }));
    }
  }
  await page.setViewport({ width: 1440, height: 1000 });
  // The bar names the current document; settings live in a sheet, paths and progress in the documents menu.
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-topbar [data-mode], .mr-topbar [data-scope]').length), 0);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn').dataset.path), 'docs/rfcs/0042-reading-first-reviews.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-file-header').length), 0);
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').disabled);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'true');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-files-progress').textContent), '1 of 3 viewed');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="settings"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.act), 'close-settings');
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.closest('.mr-settings') !== null), true);
  }
  await page.screenshot({ path: join(screenshots, 'galley-reader-settings.png') });
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-settings').hidden), true);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.act), 'settings');
  // Select a phrase using Chrome's actual shadow-root selection.
  const selected = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const paragraph = [...s.querySelectorAll('.mr-content p')].find((el) => !el.closest('[hidden]') && el.textContent.includes('design'));
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let text; while ((text = walker.nextNode())) if (text.textContent.includes('design')) break;
    const range = document.createRange(), start = text.textContent.indexOf('design');
    range.setStart(text, start); range.setEnd(text, start + 6);
    const sel = s.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const chip = s.querySelector('.mr-select-chip'), shownBefore = !s.querySelector('.mr-composer').hidden;
    chip.click();
    return { chip: !chip.disabled, shownBefore, quote: s.querySelector('.mr-comment-quote').textContent, target: s.querySelector('.mr-comment-target').textContent };
  });
  assert.equal(selected.chip, true); assert.equal(selected.shownBefore, false);
  assert.equal(selected.quote, 'design');
  assert.match(selected.target, /new text, line/);
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, textarea = s.querySelector('textarea');
    textarea.value = 'Could we explain this more clearly?';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    s.querySelector('.mr-root').scrollTop = s.querySelector('.mr-root').scrollHeight;
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-submit').disabled);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-comment-target').textContent), selected.target);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').requestSubmit());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-thread.is-own').length === 1);
  const posted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments'))[0]);
  assert.equal(posted.quote, 'design'); assert.equal(posted.body, 'Could we explain this more clearly?'); assert.equal(posted.doc.path, 'docs/rfcs/0042-reading-first-reviews.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden), true);
  assert.match(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-toast').textContent), /Comment posted/);
  // The margin button targets the paragraph under the pointer; retargeting keeps the draft.
  const commentOn = (text) => inspect((text) => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const el = [...s.querySelectorAll('.mr-content p, .mr-content .mr-tight, .mr-code-text, .mr-diagram-view img')].find((node) => !node.closest('[hidden]') && node.textContent.includes(text) || node.alt?.includes(text));
    el.scrollIntoView({ block: 'center' });
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    const button = s.querySelector('.mr-comment-btn');
    if (button.hidden) return null;
    button.click();
    return s.querySelector('.mr-comment-target').textContent;
  }, text);
  const first = await commentOn('Reviewers see the source');
  assert.match(first, /new text, line 13$/);
  await inspect(() => {
    const textarea = document.querySelector('#galley-reader').shadowRoot.querySelector('textarea');
    textarea.value = 'A draft to retarget'; textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const second = await commentOn('Most of our design work');
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-submit').disabled);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('textarea').value), 'A draft to retarget');
  assert.notEqual(second, first);
  // Escape keeps a draft; Cancel discards it and closes the composer.
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden), false);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="cancel-comment"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden), true);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('textarea').value), '');
  // Full context toggle is independent of Changes/Clean; file links now scroll in-place.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-scope="all"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-content [hidden]').length), 0);
  const codeLayout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const code = s.querySelector('.mr-content > pre'), article = s.querySelector('.mr-article');
    const rect = code.getBoundingClientRect();
    s.querySelector('.mr-root').scrollTop += rect.top - 220;
    s.getSelection().removeAllRanges();
    return { width: rect.width, prose: article.getBoundingClientRect().width, left: rect.left, right: rect.right };
  });
  // Code stays inside the reading column; the margins belong to changes and comments.
  assert.ok(codeLayout.width <= codeLayout.prose + 1, JSON.stringify(codeLayout));
  assert.ok(codeLayout.left >= 0 && codeLayout.right <= 1440, JSON.stringify(codeLayout));
  const nestedCode = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, quote = s.querySelector('.mr-content blockquote');
    const pre = document.createElement('pre');
    pre.textContent = 'A long nested snippet '.repeat(8);
    quote.append(pre);
    const rect = pre.getBoundingClientRect();
    const result = { width: rect.width, parent: quote.getBoundingClientRect().width, right: rect.right };
    pre.remove();
    return result;
  });
  assert.ok(nestedCode.width <= nestedCode.parent + 1 && nestedCode.right <= 1440, JSON.stringify(nestedCode));
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: join(screenshots, 'galley-reader-code.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-mode="clean"]').click();
    s.querySelector('[data-act="files"]').click();
    s.querySelector('[data-act="doc"][data-doc="1"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn').dataset.path === 'README.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-content').length), 3);
  // Mobile layout must not extend past either side of the viewport.
  await page.setViewport({ width: 390, height: 844 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-scope="changed"]').click();
    s.querySelector('[data-mode="changes"]').click();
    s.querySelector('.mr-root').scrollTop = 0;
  });
  // R opens the composer for the paragraph in focus; on a phone it stacks into one column.
  await page.keyboard.press('r');
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const layout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return ['.mr-composer', '.mr-topbar', '.mr-file-btn', 'textarea', '.mr-submit', '.mr-content > pre'].map((selector) => { const rect = s.querySelector(selector).getBoundingClientRect(); return { selector, left: rect.left, right: rect.right }; });
  });
  for (const rect of layout) { assert.ok(rect.left >= 0, JSON.stringify(rect)); assert.ok(rect.right <= 390, JSON.stringify(rect)); }
  const mobileCode = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, code = s.querySelector('.mr-content > pre');
    return { width: code.clientWidth, content: code.scrollWidth, page: s.querySelector('.mr-root').scrollWidth };
  });
  // Code wraps under its own indentation instead of hiding past the edge.
  assert.ok(mobileCode.content <= mobileCode.width + 1, JSON.stringify(mobileCode));
  assert.ok(mobileCode.page <= 390, JSON.stringify(mobileCode));
  await page.screenshot({ path: join(screenshots, 'galley-reader-mobile.png') });
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden), true);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="settings"]').click());
  const drawer = await inspect(() => {
    const panel = document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-settings-panel');
    return { left: panel.getBoundingClientRect().left, right: panel.getBoundingClientRect().right, width: panel.scrollWidth, client: panel.clientWidth };
  });
  assert.ok(drawer.left >= 0 && drawer.right <= 390 && drawer.width === drawer.client, JSON.stringify(drawer));
  await page.screenshot({ path: join(screenshots, 'galley-reader-settings-mobile.png') });
  await page.keyboard.press('Escape');
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-act="settings"]').click(); s.querySelector('[data-value="dark"]').click(); s.querySelector('.mr-settings [data-act="close-settings"]').click();
  });
  await page.screenshot({ path: join(screenshots, 'galley-reader-dark.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, gap = s.querySelector('.mr-context-toggle'), root = s.querySelector('.mr-root');
    root.scrollTop += gap.getBoundingClientRect().top - 260;
    gap.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: join(screenshots, 'galley-reader-context.png') });
  // Mermaid renders locally and preserves both whole diagram versions for source comments.
  await page.waitForFunction(() => [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-diagram-view')].every((el) => el.dataset.state === 'ready'));
  const diagrams = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const versions = s.querySelector('.mr-diagram').querySelectorAll('[data-mr-side]');
    const targets = [...versions].map((version) => {
      version.querySelector('img').dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
      s.querySelector('.mr-comment-btn').click();
      return s.querySelector('.mr-comment-target').textContent;
    });
    s.querySelector('[data-act="cancel-comment"]').click();
    return { count: s.querySelectorAll('.mr-diagram-view img').length, targets };
  });
  assert.equal(diagrams.count, 3); assert.match(diagrams.targets[0], /old text, lines 30–34/); assert.match(diagrams.targets[1], /new text, lines 31–37/);
  // Opting into code appends it after the documents without replacing their rendered DOM.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="code-files"]').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-code-file').length === 2);
  assert.deepEqual(await inspect(() => [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-document')].filter((el) => !el.hidden).map((el) => el.getAttribute('aria-label'))), ['docs/rfcs/0042-reading-first-reviews.md', 'README.md', 'docs/adr/0007-render-markdown-in-the-browser.md', 'src/review.ts', 'src/options.json']);
  const codeTarget = await commentOn('export const changedOnly = true;');
  assert.equal(codeTarget, 'src/review.ts · new source, line 6');
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, input = s.querySelector('textarea');
    input.value = 'Explain this default'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-submit').disabled);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').requestSubmit());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-thread.is-own').length === 2);
  const codePosted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments')).at(-1));
  assert.equal(codePosted.doc.path, 'src/review.ts'); assert.equal(codePosted.startLine, 6); assert.equal(codePosted.quote, 'export const changedOnly = true;');
  await page.setViewport({ width: 390, height: 844 });
  const sourceLayout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, source = s.querySelector('.mr-code-lines');
    return { left: source.getBoundingClientRect().left, right: source.getBoundingClientRect().right, client: source.clientWidth, scroll: source.scrollWidth, page: s.querySelector('.mr-root').scrollWidth };
  });
  assert.ok(sourceLayout.left >= 0 && sourceLayout.right <= 390 && sourceLayout.page <= 390 && sourceLayout.scroll <= sourceLayout.client + 1, JSON.stringify(sourceLayout));
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="code-files"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-document:not([hidden])').length), 3);
  // The single sticky bar follows the file in view and its Viewed button targets that file.
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, root = s.querySelector('.mr-root'), section = s.querySelectorAll('.mr-document')[1];
    root.scrollTop += section.getBoundingClientRect().top + 200 - 56;
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn').dataset.path === 'README.md');
  assert.equal(await inspect(() => Math.round(document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-topbar').getBoundingClientRect().top)), 0);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').dataset.doc), '1');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'true');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-files-progress').textContent), '2 of 3 viewed');
  // Esc peels one layer at a time: an empty composer first, then the reader, restoring the page.
  await page.keyboard.press('r');
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden);
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').hidden), true);
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => Boolean(document.querySelector('#galley-reader'))), false);
  // Reopening restores the same file's progress; unmarking removes it.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelector('.mr-viewed')?.getAttribute('aria-pressed') === 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'false');
  assert.deepEqual(errors, []);
  console.log('Reader browser checks passed: continuous files, filtering, margin threads, selection chip, margin comment button, draft retargeting, posting, mobile composer, dark theme, current file in the sticky top bar, settings sheet focus, persisted Viewed progress, Mermaid versions, optional source files and line comments, Escape layers.');
} finally { await browser.close(); }
