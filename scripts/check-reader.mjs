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
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(process.env.DEMO_URL ?? 'http://localhost:4173', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-content').length === 3);
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const initial = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return { files: s.querySelectorAll('.mr-document').length, nextButtons: s.querySelectorAll('.mr-next').length, filter: s.querySelector('[data-scope="changed"]').getAttribute('aria-pressed'), close: s.querySelector('[data-act="close"]').getAttribute('title'), hidden: s.querySelectorAll('.mr-content [hidden]').length, guide: s.querySelectorAll('.mr-reading').length };
  });
  assert.equal(initial.files, 3); assert.equal(initial.nextButtons, 0); assert.equal(initial.filter, 'true'); assert.ok(initial.hidden > 0); assert.ok(initial.guide > 0); assert.match(initial.close, /Esc/);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')), 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')), 'false');
  await page.screenshot({ path: join(screenshots, 'galley-reader-desktop.png') });
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
    return { quote: s.querySelector('.mr-comment-quote').textContent, target: s.querySelector('.mr-comment-target').textContent };
  });
  assert.equal(selected.quote, 'design');
  assert.match(selected.target, /paragraph lines/);
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
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-comment-status').textContent.includes('Comment posted'));
  const posted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments'))[0]);
  assert.equal(posted.quote, 'design'); assert.equal(posted.body, 'Could we explain this more clearly?'); assert.equal(posted.doc.path, 'docs/rfcs/0042-reading-first-reviews.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-comment-receipt').length), 1);
  // Explicitly retargeting a draft preserves its text and enables posting at the new paragraph.
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, textarea = s.querySelector('textarea');
    textarea.value = 'A draft to retarget'; textarea.dispatchEvent(new Event('input', { bubbles: true }));
    s.querySelector('[data-act="follow"]').click();
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-submit').disabled);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('textarea').value), 'A draft to retarget');
  assert.notEqual(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-comment-target').textContent), selected.target);
  await inspect(() => {
    const textarea = document.querySelector('#galley-reader').shadowRoot.querySelector('textarea');
    textarea.value = ''; textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Full context toggle is independent of Changes/Clean; file links now scroll in-place.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-scope="all"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-content [hidden]').length), 0);
  const codeLayout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const code = s.querySelector('.mr-content > pre'), article = s.querySelector('.mr-article');
    const rect = code.getBoundingClientRect();
    s.querySelector('.mr-root').scrollTop += rect.top - 220;
    s.getSelection().removeAllRanges();
    code.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    return { width: rect.width, prose: article.getBoundingClientRect().width, left: rect.left, right: rect.right };
  });
  assert.ok(codeLayout.width > codeLayout.prose * 1.4, JSON.stringify(codeLayout));
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
  assert.ok(nestedCode.width > nestedCode.parent * 1.3 && nestedCode.right <= 1440, JSON.stringify(nestedCode));
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: join(screenshots, 'galley-reader-code.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-mode="clean"]').click();
    s.querySelector('[data-act="files"]').click();
    s.querySelector('[data-doc="1"]').click();
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn .mr-path').textContent === 'README.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-content').length), 3);
  // Mobile layout must not extend past either side of the viewport.
  await page.setViewport({ width: 390, height: 844 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-scope="changed"]').click();
    s.querySelector('[data-mode="changes"]').click();
    s.querySelector('[data-act="follow"]').click();
    s.querySelector('.mr-root').scrollTop = 0;
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const layout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return ['.mr-composer', '.mr-topbar', '.mr-scope', 'textarea', '.mr-submit', '.mr-content > pre'].map((selector) => { const rect = s.querySelector(selector).getBoundingClientRect(); return { selector, left: rect.left, right: rect.right }; });
  });
  for (const rect of layout) { assert.ok(rect.left >= 0, JSON.stringify(rect)); assert.ok(rect.right <= 390, JSON.stringify(rect)); }
  const mobileCode = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, code = s.querySelector('.mr-content > pre');
    return { width: code.clientWidth, content: code.scrollWidth, page: s.querySelector('.mr-root').scrollWidth };
  });
  assert.ok(mobileCode.content > mobileCode.width, JSON.stringify(mobileCode));
  assert.ok(mobileCode.page <= 390, JSON.stringify(mobileCode));
  await page.screenshot({ path: join(screenshots, 'galley-reader-mobile.png') });
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-act="settings"]').click(); s.querySelector('[data-value="dark"]').click(); s.querySelector('[data-act="settings"]').click();
  });
  await page.screenshot({ path: join(screenshots, 'galley-reader-dark.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot, gap = s.querySelector('.mr-context-toggle'), root = s.querySelector('.mr-root');
    root.scrollTop += gap.getBoundingClientRect().top - 260;
    gap.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: join(screenshots, 'galley-reader-context.png') });
  // Esc closes even with the comment input focused, and restores the page.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('textarea').focus());
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => Boolean(document.querySelector('#galley-reader'))), false);
  assert.deepEqual(errors, []);
  console.log('Reader browser checks passed: continuous files, filtering, real selection, pinned draft, posting, mobile, dark theme, Escape.');
} finally { await browser.close(); }
