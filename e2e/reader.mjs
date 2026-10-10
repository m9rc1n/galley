// Browser-level checks: the real shadow-DOM reader, driven in Chrome against the demo page.
//   npm run test:e2e                         builds the demo, serves it and runs the checks
//   DEMO_URL=http://… node e2e/reader.mjs    use a demo server that is already running
//   CHROME_PATH=/path/to/chrome              use a specific Chrome or Chromium
//   SCREENSHOT_DIR=…                         where screenshots go (default: reports/e2e)
// Unit tests sit next to the code (src/<folder>/*.test.ts); this covers what only a browser can: layout,
// focus, selection and the sticky bar.
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { startDemoServer } from '../scripts/serve.mjs';
import { checkCodeComments, checkSpecs } from './specs.mjs';
import { checkLargeReview } from './large.mjs';
import { checkFilesLayout } from './files.mjs';

function contrast(first, second) {
  const luminance = (colour) =>
    colour
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map((channel) => Number(channel) / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
      .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

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
  ].find((path) => existsSync(path));
  if (!found) throw new Error('No Chrome found. Install Chrome or set CHROME_PATH.');
  return found;
}

const screenshots = process.env.SCREENSHOT_DIR ?? join('reports', 'e2e');
await mkdir(screenshots, { recursive: true });

const server = process.env.DEMO_URL ? null : await startDemoServer(0);
const demoUrl = process.env.DEMO_URL ?? `http://127.0.0.1:${server.address().port}`;
// Headless Chrome on Linux reports no pointing device, so pages see a touch screen ((hover: none)) and the
// mouse-only controls, such as Add a comment…, stay hidden. These checks are for a desktop with a mouse;
// narrow and touch layouts are checked by viewport size.
const MOUSE = '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2';
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox', MOUSE] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
    { name: 'prefers-color-scheme', value: 'light' },
  ]);
  await page.goto(demoUrl, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('[data-document] .mr-content').length === 3);
  await page.waitForFunction(
    () => [...document.fonts].filter((face) => face.family.startsWith('Galley ')).length === 3 && [...document.fonts].every((face) => face.status === 'loaded'),
  );
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const selectFont = (font) =>
    inspect((font) => {
      const control = document.querySelector('#galley-reader').shadowRoot.querySelector('#mr-typeface');
      control.value = font;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    }, font);
  const typography = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const title = getComputedStyle(s.querySelector('h1.mr-lead'));
    const insertion = getComputedStyle(s.querySelector('ins.mr-ins'));
    const replacement = getComputedStyle(s.querySelector('p del.mr-del + ins.mr-ins'));
    return {
      family: title.fontFamily,
      weight: title.fontWeight,
      insertion: insertion.backgroundColor,
      replacementGap: parseFloat(replacement.marginInlineStart),
    };
  });
  assert.match(typography.family, /Galley Newsreader/);
  assert.equal(typography.weight, '400');
  assert.equal(typography.insertion, 'rgb(213, 235, 203)');
  assert.ok(typography.replacementGap >= 3, 'Adjacent old and new words need a visible gap');
  const initial = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      files: [...s.querySelectorAll('.mr-document')].filter((el) => !el.hidden).length,
      nextButtons: s.querySelectorAll('.mr-next').length,
      filter: s.querySelector('[data-scope="changed"]').getAttribute('aria-pressed'),
      close: s.querySelector('[data-act="close"]').getAttribute('title'),
      hidden: s.querySelectorAll('.mr-content [hidden]').length,
      composers: s.querySelectorAll('.mr-composer').length,
      commentButtons: s.querySelectorAll('.mr-topbar [data-act*="comment"]').length,
      threads: s.querySelectorAll('.mr-thread').length,
      rail: s.querySelectorAll('.mr-threads .mr-thread').length,
    };
  });
  assert.equal(initial.files, 3);
  assert.equal(initial.nextButtons, 0);
  assert.equal(initial.filter, 'true');
  assert.ok(initial.hidden > 0);
  assert.match(initial.close, /Esc/);
  // Nothing follows the reader around: editors open only beside chosen text, threads sit in the margin, and
  // the top bar has no comment button.
  assert.equal(initial.composers, 0);
  assert.equal(initial.commentButtons, 0);
  assert.equal(initial.threads, 3);
  assert.equal(initial.rail, 2);
  const columns = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const article = s.querySelector('.mr-article').getBoundingClientRect();
    const contents = s.querySelector('.mr-toc').getBoundingClientRect();
    const threads = s.querySelector('.mr-threads').getBoundingClientRect();
    return {
      article: { left: article.left, right: article.right },
      contents: { left: contents.left, right: contents.right },
      threads: { left: threads.left, right: threads.right },
    };
  });
  assert.ok(
    columns.article.left - columns.contents.right >= 55 && columns.threads.left - columns.article.right >= 55 && columns.threads.right <= 1440,
    JSON.stringify(columns),
  );
  for (const width of [1280, 1360, 1440, 1920, 1440, 1100, 1440]) {
    await page.setViewport({ width, height: 1000 });
    await page.waitForFunction(
      (wide) => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').classList.contains('has-rail') === wide,
      {},
      width >= 1280,
    );
    const gaps = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot,
        article = s.querySelector('.mr-article').getBoundingClientRect();
      const toc = s.querySelector('.mr-toc').getBoundingClientRect(),
        rail = s.querySelector('.mr-threads').getBoundingClientRect(),
        mark = s.querySelector('.mr-mark').getBoundingClientRect();
      const dots = [...s.querySelectorAll('.mr-toc .mr-dot')].map((dot) => {
        const rect = dot.getBoundingClientRect(),
          label = dot.parentElement.querySelector('span:not(.mr-dot)').getBoundingClientRect();
        return { toLabel: label.left - rect.right, toMarker: mark.left - rect.right };
      });
      const inlineThreads = [...s.querySelectorAll('.mr-content .mr-thread')].filter((thread) => !thread.closest('.mr-file-threads')).length;
      return { left: article.left - toc.right, right: rail.left - article.right, marker: mark.left - toc.right, dots, inlineThreads };
    });
    if (width >= 1280) {
      assert.ok(gaps.left >= 55 && gaps.right >= 55 && gaps.marker >= 19 && gaps.inlineThreads === 0, JSON.stringify({ width, gaps }));
      assert.ok(
        gaps.dots.length > 0 && gaps.dots.every((dot) => dot.toLabel >= 9 && dot.toLabel <= 11 && dot.toMarker >= 150),
        'Contents dots belong beside their labels, away from the document change bars',
      );
    } else assert.equal(gaps.inlineThreads, 2, 'Resizing moves comments inline even when the prose width stays the same');
  }
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')),
    'true',
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').click());
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-context-toggle').getAttribute('aria-expanded')),
    'false',
  );
  await page.screenshot({ path: join(screenshots, 'galley-reader-desktop.png') });
  // Toolbar controls stay centred, ordered and within the viewport at every supported width.
  for (const width of [1440, 1100, 900, 768, 760, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    const aligned = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return [...s.querySelectorAll('.mr-topbar button')]
        .filter((el) => el.getClientRects().length && !el.closest('[hidden]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { act: el.dataset.act, left: r.left, right: r.right, center: (r.top + r.bottom) / 2 };
        });
    });
    for (let i = 0; i < aligned.length; i++) {
      assert.ok(aligned[i].left >= 0 && aligned[i].right <= width, JSON.stringify({ width, aligned }));
      assert.ok(Math.abs(aligned[i].center - 26) < 1, JSON.stringify({ width, aligned }));
      if (i) assert.ok(aligned[i].left >= aligned[i - 1].right, JSON.stringify({ width, aligned }));
    }
  }
  await page.setViewport({ width: 1440, height: 1000 });
  // The top glow is optional, independently of the palette and brightness.
  const glow = () =>
    inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return {
        checked: s.querySelector('[data-act="top-glow"]').getAttribute('aria-checked'),
        layers: ['::before', '::after'].map((pseudo) => getComputedStyle(s.querySelector('.mr-topbar'), pseudo).content),
      };
    });
  assert.equal((await glow()).checked, 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="top-glow"]').click());
  assert.deepEqual(await glow(), { checked: 'false', layers: ['none', 'none'] });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="top-glow"]').click());
  assert.equal((await glow()).checked, 'true');
  assert.ok((await glow()).layers.every((content) => content !== 'none'));
  // The bar names the current document; settings live in a sheet, paths and progress in the documents menu.
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-topbar [data-mode], .mr-topbar [data-scope]').length),
    0,
  );
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn').dataset.path),
    'docs/rfcs/0042-reading-first-reviews.md',
  );
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-file-header').length), 0);
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').disabled);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'true');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-files-progress').textContent), '1 of 3 viewed');
  // A checked file folds away, as on GitHub; Show changes opens it again, still viewed.
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-document[data-document="0"]').classList.contains('is-folded')),
    true,
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-document[data-document="0"] [data-act="show-quiet"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed')), 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="settings"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.act), 'close-settings');
  await page.keyboard.press('Tab');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.settingsTab), 'reading');
  await page.keyboard.press('ArrowRight');
  // Layout sits between reading and review: six layouts drawn as pages, and a density choice.
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('#mr-layout-panel').hidden), false);
  assert.deepEqual(
    await inspect(() =>
      [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('[data-setting="layout"] [data-value]')].map((b) => [
        b.dataset.value,
        b.getAttribute('aria-pressed'),
      ]),
    ),
    [
      ['balanced', 'true'],
      ['files', 'false'],
      ['review', 'false'],
      ['wide', 'false'],
      ['focus', 'false'],
      ['fit', 'false'],
    ],
  );
  await page.keyboard.press('ArrowRight');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('#mr-review-panel').hidden), false);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-setting="comments"]')), null);
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-settings').textContent.includes('Comment cards')),
    false,
  );
  await page.keyboard.press('Tab');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.mode), 'changes');
  await page.screenshot({ path: join(screenshots, 'galley-reader-review-settings.png') });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-settings-tab="reading"]').click());
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.closest('.mr-settings') !== null), true);
  }
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-settings-tab="reading"]').click();
    s.querySelector('button[data-act="close-settings"]').focus();
  });
  await page.screenshot({ path: join(screenshots, 'galley-reader-settings.png') });
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-settings').hidden), true);
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.dataset.act), 'settings');
  // Select a phrase using Chrome's actual shadow-root selection.
  const selected = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const paragraph = [...s.querySelectorAll('.mr-content p')].find((el) => !el.closest('[hidden]') && el.textContent.includes('design'));
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let text = walker.nextNode();
    while (text && !text.textContent.includes('design')) text = walker.nextNode();
    const range = document.createRange(),
      start = text.textContent.indexOf('design');
    range.setStart(text, start);
    range.setEnd(text, start + 6);
    const sel = s.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const chip = s.querySelector('.mr-select-chip'),
      shownBefore = s.querySelectorAll('.mr-composer').length;
    chip.click();
    const composer = s.activeElement.closest('.mr-composer'),
      rect = composer.getBoundingClientRect(),
      block = paragraph.getBoundingClientRect();
    return {
      chip: !chip.disabled,
      shownBefore,
      quote: composer.querySelector('.mr-comment-quote').textContent,
      target: composer.querySelector('.mr-comment-target').textContent,
      inRail: composer.parentElement.matches('.mr-threads'),
      width: rect.width,
      level: Math.abs(rect.top - block.top),
    };
  });
  assert.equal(selected.chip, true);
  assert.equal(selected.shownBefore, 0);
  assert.equal(selected.quote, 'design');
  assert.match(selected.target, /^Comment on line \d+$/);
  // The editor opens beside its text in the comments column, wide enough to write in.
  assert.ok(selected.inRail && selected.width >= 340 && selected.level <= 40, JSON.stringify(selected));
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      textarea = s.querySelector('.mr-composer textarea');
    textarea.value = 'Could we explain this more clearly?';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    s.querySelector('.mr-root').scrollTop = s.querySelector('.mr-root').scrollHeight;
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer .mr-submit').disabled);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer .mr-comment-target').textContent),
    selected.target,
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').requestSubmit());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-thread.is-own').length === 1);
  const posted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments'))[0]);
  assert.equal(posted.quote, 'design');
  assert.equal(posted.body, 'Could we explain this more clearly?');
  assert.equal(posted.doc.path, 'docs/rfcs/0042-reading-first-reviews.md');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-composer').length), 0);
  assert.match(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-toast').textContent), /Comment posted/);
  // The control beside the paragraph under the pointer opens an editor for it; each text keeps its own draft.
  const commentOn = (text) =>
    inspect((text) => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      const el = [...s.querySelectorAll('.mr-content p, .mr-content .mr-tight, .mr-code-text, .mr-diagram-view img')].find(
        (node) => (!node.closest('[hidden]') && node.textContent.includes(text)) || node.alt?.includes(text),
      );
      el.scrollIntoView({ block: 'center' });
      el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
      const button = s.querySelector('.mr-comment-btn');
      if (button.hidden) return null;
      button.click();
      return s.activeElement.closest('.mr-composer').querySelector('.mr-comment-target').textContent;
    }, text);
  const first = await commentOn('Most of our design work');
  assert.equal(first, 'Comment on line 11');
  await inspect(() => {
    const textarea = document.querySelector('#galley-reader').shadowRoot.activeElement;
    textarea.value = 'A draft that stays';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const second = await commentOn('A small browser extension adds');
  assert.notEqual(second, first);
  assert.deepEqual(
    await inspect(() => [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-composer textarea')].map((field) => field.value)),
    ['A draft that stays', ''],
  );
  // Escape closes an empty editor and keeps a draft; Cancel discards a draft.
  await page.keyboard.press('Escape');
  assert.equal(
    await inspect(
      () => document.querySelectorAll('#galley-reader') && document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-composer').length,
    ),
    1,
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer .mr-cancel').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-composer').length), 0);
  // Full context toggle is independent of Changes/Clean; file links now scroll in-place.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-scope="all"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-content [hidden]').length), 0);
  const codeLayout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const code = s.querySelector('.mr-content > pre'),
      article = s.querySelector('.mr-article');
    const rect = code.getBoundingClientRect();
    s.querySelector('.mr-root').scrollTop += rect.top - 220;
    s.getSelection().removeAllRanges();
    return {
      width: rect.width,
      prose: article.getBoundingClientRect().width,
      left: rect.left,
      right: rect.right,
      articleRight: article.getBoundingClientRect().right,
    };
  });
  // A code block runs as wide as its longest line, up to 120 characters, growing to the left: its right
  // edge stays level with the text, so the comments column beside it stays clear.
  assert.ok(codeLayout.width >= codeLayout.prose - 1 && codeLayout.width <= 1100, JSON.stringify(codeLayout));
  assert.ok(Math.abs(codeLayout.right - codeLayout.articleRight) <= 1, JSON.stringify(codeLayout));
  assert.ok(codeLayout.left >= 0 && codeLayout.right <= 1440, JSON.stringify(codeLayout));
  const nestedCode = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      quote = s.querySelector('.mr-content blockquote');
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
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('[data-document] .mr-content').length), 3);
  // Mobile layout must not extend past either side of the viewport.
  assert.equal(
    await inspect(() => getComputedStyle(document.querySelector('#galley-reader').shadowRoot.querySelector('p del.mr-del + ins.mr-ins')).marginInlineStart),
    '0px',
    'Clean reading must retain the document’s original spacing',
  );
  await page.setViewport({ width: 390, height: 844 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-scope="changed"]').click();
    s.querySelector('[data-mode="changes"]').click();
    s.querySelector('.mr-root').scrollTop = 0;
  });
  // On phones, R opens the editor below the paragraph in focus, within the screen.
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.activeElement?.matches('.mr-composer textarea'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  const layout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return ['.mr-composer', '.mr-topbar', '.mr-file-btn', '.mr-composer textarea', '.mr-composer .mr-submit', '.mr-content > pre'].map((selector) => {
      const rect = s.querySelector(selector).getBoundingClientRect();
      return { selector, left: rect.left, right: rect.right, height: rect.height };
    });
  });
  for (const rect of layout) {
    assert.ok(rect.left >= 0, JSON.stringify(rect));
    assert.ok(rect.right <= 390, JSON.stringify(rect));
  }
  assert.ok(layout.find((rect) => rect.selector === '.mr-composer .mr-submit').height >= 44, 'Touch targets in the editor');
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').parentElement.matches('.mr-threads')),
    false,
  );
  const mobileCode = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      code = s.querySelector('.mr-content > pre');
    return { width: code.clientWidth, content: code.scrollWidth, page: s.querySelector('.mr-root').scrollWidth };
  });
  // Code wraps under its own indentation instead of hiding past the edge.
  assert.ok(mobileCode.content <= mobileCode.width + 1, JSON.stringify(mobileCode));
  assert.ok(mobileCode.page <= 390, JSON.stringify(mobileCode));
  await page.screenshot({ path: join(screenshots, 'galley-reader-mobile.png') });
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer')), null);
  // A deferred touch tap must retain the paragraph inside the shadow root after event retargeting.
  await inspect(async () => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.getSelection().removeAllRanges();
    // Let removing the previous editor finish its layout and any resulting scroll adjustment.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const paragraph = [...s.querySelectorAll('.mr-content p[data-mr-u]')].find((p) => p.getClientRects().length && !p.closest('[hidden]'));
    paragraph.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerType: 'touch', clientX: 180, clientY: 250 }));
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-select-chip').hidden);
  // Layout frames must leave the touch target available; only actual scrolling dismisses it.
  const touchChip = await inspect(async () => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('.mr-root').dispatchEvent(new Event('galley:context'));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const chip = s.querySelector('.mr-select-chip');
    return { hidden: chip.hidden, disabled: chip.disabled };
  });
  assert.deepEqual(touchChip, { hidden: false, disabled: false });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-select-chip').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.activeElement?.matches('.mr-composer textarea'));
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer')), null);
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
    s.querySelector('[data-act="settings"]').click();
    s.querySelector('[data-value="dark"]').click();
    s.querySelector('.mr-settings [data-act="close-settings"]').click();
  });
  await page.screenshot({ path: join(screenshots, 'galley-reader-dark.png') });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-value="sepia"]').click());
  await page.screenshot({ path: join(screenshots, 'galley-reader-sepia.png') });
  await selectFont('sans');
  assert.match(
    await inspect(() => getComputedStyle(document.querySelector('#galley-reader').shadowRoot.querySelector('h1.mr-lead')).fontFamily),
    /Galley DM Sans/,
  );
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const control = s.querySelector('#mr-typeface');
    control.value = 'serif';
    control.dispatchEvent(new Event('change', { bubbles: true }));
    s.querySelector('[data-value="dark"]').click();
  });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      gap = s.querySelector('.mr-context-toggle'),
      root = s.querySelector('.mr-root');
    root.scrollTop += gap.getBoundingClientRect().top - 260;
    gap.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: join(screenshots, 'galley-reader-context.png') });
  // Mermaid renders locally and preserves both whole diagram versions for source comments.
  await page.waitForFunction(() =>
    [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-diagram-view')].every((el) => el.dataset.state === 'ready'),
  );
  const diagrams = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const versions = s.querySelector('.mr-diagram').querySelectorAll('[data-mr-side]');
    const targets = [...versions].map((version) => {
      version.querySelector('img').dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
      s.querySelector('.mr-comment-btn').click();
      return s.activeElement.closest('.mr-composer').querySelector('.mr-comment-target').textContent;
    });
    s.activeElement.closest('.mr-composer').querySelector('.mr-cancel').click();
    const image = s.querySelector('.mr-diagram-view img');
    return {
      count: s.querySelectorAll('.mr-diagram-view img').length,
      targets,
      editors: s.querySelectorAll('.mr-composer').length,
      natural: image.width,
      shown: image.getBoundingClientRect().width,
    };
  });
  assert.equal(diagrams.count, 3);
  assert.equal(diagrams.targets[0], 'Comment on old lines 30–34');
  assert.equal(diagrams.targets[1], 'Comment on lines 31–37');
  assert.equal(diagrams.editors, 0, 'An editor left empty makes way for the next one; Cancel closes the other');
  // Diagrams are shown at the size they were laid out for, never stretched beyond it.
  assert.ok(diagrams.natural > 0 && diagrams.shown <= diagrams.natural + 1, JSON.stringify(diagrams));
  // They are drawn in the reading palette, and choosing one enlarges it in a dialog that Escape closes.
  const palette = await inspect(() => decodeURIComponent(document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-diagram-view img').src));
  assert.ok(!/#ececff|#9370db/i.test(palette), 'Mermaid’s own lavender theme must not show through');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-diagram-zoom').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-lightbox').hidden), false);
  // Enlarged, the diagram takes the window, then zooms in further; clicking the drawing keeps it open.
  const enlarged = () =>
    inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return {
        width: s.querySelector('.mr-lightbox img').getBoundingClientRect().width,
        inline: s.querySelector('.mr-diagram-zoom img').getBoundingClientRect().width,
      };
    });
  const fitted = await enlarged();
  assert.ok(fitted.width > fitted.inline, JSON.stringify(fitted));
  await page.screenshot({ path: join(screenshots, 'galley-reader-diagram-enlarged.png') });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="zoom-in"]').click());
  assert.ok((await enlarged()).width > fitted.width, 'Zooming in makes the diagram larger');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-lightbox img').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-lightbox').hidden), false);
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-lightbox').hidden), true);
  // Mermaid and highlight.js run in script-only sandboxed frames inside the reader, never in the page.
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-content [class^="hljs-"]'));
  const frames = await inspect(() => ({
    page: document.querySelectorAll('iframe').length,
    reader: [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('iframe')]
      .map((frame) => `${frame.getAttribute('sandbox')} ${new URL(frame.src).pathname}`)
      .sort(),
  }));
  assert.equal(frames.page, 0);
  assert.deepEqual(frames.reader, ['allow-scripts /build/diagram-frame.html', 'allow-scripts /build/highlight-frame.html']);
  // Opting into code appends it after the documents without replacing their rendered DOM.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="code-files"]').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-code-file').length === 2);
  assert.deepEqual(
    await inspect(() =>
      [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-document')]
        .filter((el) => !el.hidden)
        .map((el) => el.getAttribute('aria-label')),
    ),
    ['docs/rfcs/0042-reading-first-reviews.md', 'README.md', 'docs/adr/0007-render-markdown-in-the-browser.md', 'src/review.ts', 'src/options.json'],
  );
  const codeTarget = await commentOn('export const changedOnly = true;');
  assert.equal(codeTarget, 'Comment on line 6');
  const sourceColumns = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const article = s.querySelector('.mr-article').getBoundingClientRect();
    const code = s.querySelector('.mr-document.is-code').getBoundingClientRect(),
      lines = s.querySelector('.mr-document.is-code .mr-code-lines');
    const composer = s.querySelector('.mr-composer'),
      box = composer.getBoundingClientRect();
    const text = s.querySelector('.mr-document.is-code .mr-code-line[data-mr-change] .mr-code-text'),
      style = getComputedStyle(text),
      canvas = document.createElement('canvas').getContext('2d');
    canvas.font = `${style.fontSize} ${style.fontFamily}`;
    const codeMarks = [...s.querySelectorAll('.mr-mark')].filter((mark) => {
      const rect = mark.getBoundingClientRect();
      return rect.top >= code.top && rect.top < code.bottom;
    }).length;
    return {
      left: code.left,
      width: code.width,
      proseWidth: article.width,
      right: code.right,
      characters: Math.floor(text.getBoundingClientRect().width / canvas.measureText('0').width),
      inRail: composer.parentElement.matches('.mr-threads') && lines.contains(composer) === false,
      composerLeft: box.left,
      composerRight: box.right,
      composerWidth: box.width,
      codeMarks,
    };
  });
  // Source files are much wider than prose, and are commented on the same way: in the column beside them.
  assert.ok(sourceColumns.left >= 24 && sourceColumns.width > sourceColumns.proseWidth + 300 && sourceColumns.characters >= 115, JSON.stringify(sourceColumns));
  assert.ok(
    sourceColumns.inRail && sourceColumns.composerLeft - sourceColumns.right >= 55 && sourceColumns.composerRight <= 1440 && sourceColumns.composerWidth >= 300,
    JSON.stringify(sourceColumns),
  );
  assert.equal(sourceColumns.codeMarks, 0);
  await page.screenshot({ path: join(screenshots, 'galley-reader-source-review.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      input = s.querySelector('.mr-composer textarea');
    input.value = 'Explain this default';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer .mr-submit').disabled);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').requestSubmit());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-thread.is-own').length === 2);
  const codePosted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments')).at(-1));
  assert.equal(codePosted.doc.path, 'src/review.ts');
  assert.equal(codePosted.startLine, 6);
  assert.equal(codePosted.quote, 'export const changedOnly = true;');
  const sourceSizes = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const line = s.querySelector('.mr-code-line'),
      title = s.querySelector('.mr-document[data-document] .mr-content > h1, .mr-document[data-document] .mr-title');
    const sizes = () => ({
      code: parseFloat(getComputedStyle(line).fontSize),
      title: parseFloat(getComputedStyle(title).fontSize),
      byline: parseFloat(getComputedStyle(s.querySelector('.mr-byline')).fontSize),
    });
    const before = sizes();
    s.querySelector('[data-act="larger"]').click();
    const after = sizes();
    s.querySelector('[data-act="smaller"]').click();
    return { before, after };
  });
  assert.ok(sourceSizes.after.code > sourceSizes.before.code, 'Source text respects the reading size setting');
  // The text size is the whole reading surface's, not the body's alone.
  assert.ok(sourceSizes.after.title > sourceSizes.before.title && sourceSizes.after.byline > sourceSizes.before.byline, JSON.stringify(sourceSizes));
  for (const width of [1280, 1100, 900, 768, 760, 390, 320]) {
    await page.setViewport({ width, height: 844 });
    const source = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot,
        code = s.querySelector('.mr-code-lines'),
        rect = code.getBoundingClientRect();
      return { left: rect.left, right: rect.right, client: code.clientWidth, scroll: code.scrollWidth, page: s.querySelector('.mr-root').scrollWidth };
    });
    assert.ok(source.left >= 0 && source.right <= width && source.page <= width && source.scroll <= source.client + 1, JSON.stringify({ width, source }));
  }
  await page.setViewport({ width: 390, height: 844 });
  const sourceLayout = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      source = s.querySelector('.mr-code-lines');
    return {
      left: source.getBoundingClientRect().left,
      right: source.getBoundingClientRect().right,
      client: source.clientWidth,
      scroll: source.scrollWidth,
      page: s.querySelector('.mr-root').scrollWidth,
    };
  });
  assert.ok(
    sourceLayout.left >= 0 && sourceLayout.right <= 390 && sourceLayout.page <= 390 && sourceLayout.scroll <= sourceLayout.client + 1,
    JSON.stringify(sourceLayout),
  );
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="code-files"]').click());
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-document:not([hidden])').length), 3);
  // The single sticky bar follows the file in view and its Viewed button targets that file.
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      root = s.querySelector('.mr-root'),
      section = s.querySelectorAll('.mr-document[data-document]')[1];
    root.scrollTop += section.getBoundingClientRect().top + 200 - 56;
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-file-btn').dataset.path === 'README.md');
  assert.equal(await inspect(() => Math.round(document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-topbar').getBoundingClientRect().top)), 0);
  await page.waitForFunction(() => {
    const bar = document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-topbar');
    return ['::before', '::after'].every((pseudo) => {
      const opacity = Number(getComputedStyle(bar, pseudo).opacity);
      return opacity > 0 && opacity <= 0.6;
    });
  });
  const scrolledGlow = await inspect(() => {
    const bar = document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-topbar');
    return {
      border: getComputedStyle(bar).borderBottomColor,
      layers: ['::before', '::after'].map((pseudo) => {
        const style = getComputedStyle(bar, pseudo);
        return { opacity: Number(style.opacity), animation: style.animationPlayState };
      }),
    };
  });
  assert.ok(
    scrolledGlow.layers.every((layer) => layer.opacity > 0 && layer.opacity <= 0.6 && layer.animation === 'running'),
    'The top glow stays visible but gentler while scrolling',
  );
  assert.equal(scrolledGlow.border, 'rgba(0, 0, 0, 0)');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').dataset.doc), '1');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'true');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-files-progress').textContent), '2 of 3 viewed');
  // Esc peels one layer at a time: an empty editor first, then the reader, restoring the page.
  await page.keyboard.press('r');
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer'));
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer')), null);
  await page.keyboard.press('Escape');
  assert.equal(await inspect(() => Boolean(document.querySelector('#galley-reader'))), false);
  // Reopening restores the same file's progress; unmarking removes it.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelector('.mr-viewed')?.getAttribute('aria-pressed') === 'true');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-viewed').getAttribute('aria-pressed') === 'false');
  // Replies stay in their conversation and use an editor inside the card, including on phones.
  const beforeReply = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const card = s.querySelector('.mr-thread');
    const count = card.querySelectorAll('.mr-thread-comment').length;
    // Each comment has its own Reply; the box opens under the comment it answers.
    [...card.querySelectorAll('.mr-reply-to')].at(-1).click();
    return { count, threads: s.querySelectorAll('.mr-thread').length };
  });
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.activeElement?.matches('.mr-reply textarea'));
  await inspect(() => {
    const input = document.querySelector('#galley-reader').shadowRoot.activeElement;
    input.value = 'I can add that reference. **Thanks!**';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.screenshot({ path: join(screenshots, 'galley-reader-reply-desktop.png') });
  await page.keyboard.down('Control');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-toast').textContent.includes('Reply posted'));
  const replied = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      card = s.querySelector('.mr-thread');
    return {
      count: card.querySelectorAll('.mr-thread-comment').length,
      threads: s.querySelectorAll('.mr-thread').length,
      body: card.querySelector('.mr-thread-comment:last-of-type .mr-thread-body')?.textContent,
      saved: JSON.parse(sessionStorage.getItem('galley:demo-replies') ?? '[]'),
    };
  });
  assert.equal(replied.count, beforeReply.count + 1);
  assert.equal(replied.threads, beforeReply.threads);
  assert.equal(replied.saved.length, 1);
  assert.equal(replied.saved[0].body, 'I can add that reference. **Thanks!**');
  await page.setViewport({ width: 390, height: 844 });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-thread .mr-reply-to').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.activeElement?.matches('.mr-reply textarea'));
  await inspect(() => {
    const input = document.querySelector('#galley-reader').shadowRoot.activeElement;
    input.value = 'A reply draft on mobile';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const mobileReply = await inspect(() => {
    const box = document.querySelector('#galley-reader').shadowRoot.activeElement.closest('.mr-reply');
    return [box, ...box.querySelectorAll('textarea, button')].map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, height: r.height, button: el.tagName === 'BUTTON' };
    });
  });
  for (const rect of mobileReply) assert.ok(rect.left >= 0 && rect.right <= 390 && (!rect.button || rect.height >= 44), JSON.stringify(rect));
  await page.screenshot({ path: join(screenshots, 'galley-reader-reply-mobile.png') });
  await page.keyboard.press('Escape');
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-thread .mr-reply textarea').value),
    'A reply draft on mobile',
  );
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-thread .mr-reply .mr-cancel').click());
  await page.setViewport({ width: 1440, height: 1000 });
  // Colour and brightness are independent, with readable light and dark versions of every palette.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="settings"]').click());
  const backgrounds = { light: new Set(), dark: new Set() };
  const contrastReport = [],
    contrastFailures = [];
  const palettes = await inspect(() =>
    [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('[data-setting="theme"] [data-value]')].map((button) => button.dataset.value),
  );
  assert.equal(palettes.length, 19);
  for (const theme of palettes) {
    await inspect(
      (theme) => document.querySelector('#galley-reader').shadowRoot.querySelector(`[data-setting="theme"] [data-value="${theme}"]`).click(),
      theme,
    );
    for (const appearance of ['light', 'dark']) {
      const colours = await inspect((appearance) => {
        const s = document.querySelector('#galley-reader').shadowRoot;
        s.querySelector(`[data-setting="appearance"] [data-value="${appearance}"]`).click();
        const root = s.querySelector('.mr-root'),
          style = getComputedStyle(root);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        const opaque = (...colours) => {
          context.clearRect(0, 0, 1, 1);
          for (const colour of colours) {
            context.fillStyle = colour;
            context.fillRect(0, 0, 1, 1);
          }
          const data = context.getImageData(0, 0, 1, 1).data;
          return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
        };
        const samples = [];
        const probe = document.createElement('div');
        root.append(probe);
        for (const background of ['--bg', '--card', '--soft', '--code-bg', '--code-add', '--code-del', '--code-moved', '--ins-band', '--del-bg', '--add-bg']) {
          probe.style.backgroundColor = `var(${background})`;
          const bg = opaque(style.backgroundColor, getComputedStyle(probe).backgroundColor);
          const tokens = background.startsWith('--code')
            ? [
                '--fg',
                '--muted',
                '--hl-comment',
                '--hl-keyword',
                '--hl-string',
                '--hl-number',
                '--hl-title',
                '--hl-attr',
                '--hl-builtin',
                '--hl-tag',
                '--hl-meta',
              ]
            : background === '--del-bg'
              ? ['--del']
              : background === '--add-bg'
                ? ['--add']
                : ['--fg', '--muted'];
          for (const token of tokens) {
            probe.style.color = `var(${token})`;
            samples.push({ name: `${token} on ${background}`, fg: opaque(bg, getComputedStyle(probe).color), bg, minimum: 4.5 });
          }
        }
        probe.style.backgroundColor = 'var(--bg)';
        samples.push({
          name: 'comment placeholder',
          fg: opaque(style.backgroundColor, getComputedStyle(s.querySelector('textarea'), '::placeholder').color),
          bg: style.backgroundColor,
          minimum: 4.5,
        });
        for (const token of ['--accent', '--gutter-added', '--gutter-modified', '--gutter-removed']) {
          probe.style.color = `var(${token})`;
          samples.push({ name: token, fg: opaque(style.backgroundColor, getComputedStyle(probe).color), bg: style.backgroundColor, minimum: 3 });
        }
        const card = s.querySelector('[data-setting="theme"] button[aria-pressed="true"]');
        const cardStyle = getComputedStyle(card);
        for (const selector of ['.mr-theme-name', '.mr-theme-caption', '.mr-theme-preview']) {
          samples.push({ name: `palette ${selector}`, fg: getComputedStyle(card.querySelector(selector)).color, bg: cardStyle.backgroundColor, minimum: 4.5 });
        }
        const surfaces = {};
        for (const token of ['card', 'soft', 'code-bg', 'rule', 'control-rule', 'accent']) {
          probe.style.backgroundColor = `var(--${token})`;
          surfaces[token] = opaque(style.backgroundColor, getComputedStyle(probe).backgroundColor);
        }
        const active = getComputedStyle(s.querySelector('[data-setting="appearance"] [aria-pressed="true"]'));
        samples.push({
          name: 'active appearance choice',
          fg: opaque(style.backgroundColor, active.backgroundColor, active.color),
          bg: opaque(style.backgroundColor, active.backgroundColor),
          minimum: 4.5,
        });
        probe.remove();
        return {
          surfaces,
          theme: root.dataset.theme,
          dark: root.classList.contains('is-dark'),
          background: style.backgroundColor,
          foreground: style.color,
          muted: getComputedStyle(s.querySelector('.mr-settings-note')).color,
          previewBackground: cardStyle.backgroundColor,
          previewForeground: cardStyle.color,
          selectedChecks: [...s.querySelectorAll('[data-setting="theme"] .mr-theme-label .mr-icon')].filter(
            (icon) => getComputedStyle(icon).visibility === 'visible',
          ).length,
          samples,
        };
      }, appearance);
      assert.equal(colours.theme, theme, 'Appearance must not replace the palette');
      assert.equal(colours.dark, appearance === 'dark');
      assert.equal(colours.previewBackground, colours.background, 'Palette cards must preview the actual page in the current appearance');
      assert.equal(colours.previewForeground, colours.foreground, 'Palette text must preview the actual reading colour');
      assert.equal(colours.selectedChecks, 1, 'Only the selected palette should have a checkmark');
      if (appearance === 'dark') {
        assert.ok(contrast(colours.surfaces.card, colours.background) >= 1.45, `${theme}: cards must stand apart from the page`);
        assert.ok(contrast(colours.surfaces.soft, colours.background) >= 1.8, `${theme}: controls must stand apart from the page`);
        assert.ok(contrast(colours.surfaces['code-bg'], colours.background) >= 1.15, `${theme}: code must have its own surface`);
        // Decorative dividers stay quiet; the boundaries of editable controls retain 3:1 contrast.
        assert.ok(contrast(colours.surfaces['control-rule'], colours.surfaces.card) >= 3, `${theme}: visible control borders`);
        assert.ok(contrast(colours.surfaces.accent, colours.surfaces.card) >= 3, `${theme}: visible focus rings on cards`);
      }
      assert.ok(contrast(colours.foreground, colours.background) >= 7, `${theme} ${appearance}: prose contrast`);
      assert.ok(contrast(colours.muted, colours.background) >= 4.5, `${theme} ${appearance}: interface contrast`);
      for (const sample of colours.samples) {
        const ratio = contrast(sample.fg, sample.bg);
        contrastReport.push({ theme, appearance, ...sample, ratio });
        if (ratio < sample.minimum) contrastFailures.push(`${theme} ${appearance}: ${sample.name} = ${ratio.toFixed(2)}:1`);
      }
      backgrounds[appearance].add(colours.background);
    }
  }
  assert.equal(backgrounds.light.size, palettes.length);
  assert.equal(backgrounds.dark.size, palettes.length);
  await writeFile(join(screenshots, 'contrast.json'), JSON.stringify(contrastReport, null, 2));
  assert.deepEqual(contrastFailures, [], 'Every reading and syntax colour must meet its contrast minimum');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-value="auto"]').click());
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'light' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').classList.contains('is-dark'));
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').classList.contains('is-dark'));
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').dataset.theme), palettes.at(-1));
  for (const [font, family] of [
    ['galley', 'Galley Newsreader'],
    ['serif', 'Galley Newsreader'],
    ['sans', 'Galley DM Sans'],
    ['georgia', 'Georgia'],
    ['system', 'system-ui'],
    ['mono', 'monospace'],
  ]) {
    await selectFont(font);
    const actual = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return getComputedStyle(s.querySelector('h1.mr-lead')).fontFamily;
    });
    assert.ok(actual.includes(family), `${font}: ${actual}`);
  }
  // Galley pairs two faces: Newsreader for headings, DM Sans for the text beneath them.
  await selectFont('galley');
  const pairing = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      standfirst: getComputedStyle(s.querySelector('.mr-subtitle')).fontFamily,
      text: getComputedStyle(s.querySelector('.mr-content p:not(.mr-subtitle)')).fontFamily,
    };
  });
  assert.ok(pairing.standfirst.includes('Galley Newsreader') && pairing.text.includes('Galley DM Sans'), JSON.stringify(pairing));
  await selectFont('serif');
  for (const width of [390, 320]) {
    await page.setViewport({ width, height: 844 });
    const cards = await inspect(() =>
      [
        ...document
          .querySelector('#galley-reader')
          .shadowRoot.querySelectorAll('[data-setting="theme"] .mr-palette-page:first-child button, .mr-font-select select'),
      ].map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height, client: button.clientWidth, scroll: button.scrollWidth };
      }),
    );
    for (const card of cards)
      assert.ok(card.left >= 0 && card.right <= width && card.height >= 44 && card.scroll <= card.client + 1, JSON.stringify({ width, card }));
    if (width === 390) await page.screenshot({ path: join(screenshots, 'galley-reader-themes-mobile.png') });
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-value="paper"]').click());
  await page.screenshot({ path: join(screenshots, 'galley-reader-themes.png') });
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-value="dark"]').click());
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'light' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);
  assert.equal(
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').classList.contains('is-dark')),
    true,
    'Manual appearance must ignore system changes',
  );
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => {
    const root = document.querySelector('#galley-reader')?.shadowRoot.querySelector('.mr-root');
    return root?.dataset.theme === 'paper' && root.classList.contains('is-dark');
  });
  assert.deepEqual(errors, []);
  // Host pages can forbid font URLs. The extension's bundled binary faces still load in that policy.
  await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
  await inspect(() => {
    const policy = document.createElement('meta');
    policy.httpEquiv = 'Content-Security-Policy';
    policy.content = "font-src 'none'";
    document.head.append(policy);
    document.querySelector('#galley-launcher').shadowRoot.querySelector('button').click();
  });
  // The merge request's own description is an optional first document, off until chosen.
  const overview = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot,
      section = s.querySelector('.mr-overview');
    const before = section.hidden;
    s.querySelector('[data-act="overview"]').click();
    const shown = {
      before,
      after: section.hidden,
      first: section === s.querySelector('.mr-document:not([hidden])'),
      title: section.querySelector('.mr-title').textContent,
      list: section.querySelectorAll('.mr-content li').length,
    };
    s.querySelector('[data-act="overview"]').click();
    return shown;
  });
  assert.deepEqual(overview, { before: true, after: false, first: true, title: 'Docs: reading-first reviews', list: 2 });
  await page.waitForFunction(
    () => [...document.fonts].filter((face) => face.family.startsWith('Galley ')).length === 3 && [...document.fonts].every((face) => face.status === 'loaded'),
  );
  await checkSpecs(browser, demoUrl, screenshots);
  await checkCodeComments(browser, demoUrl, screenshots);
  await checkLargeReview(browser, demoUrl, screenshots);
  await checkFilesLayout(browser, demoUrl, screenshots);
  console.log(
    'Reader browser checks passed: contents/document/comment columns, wide source files, continuous files, filtering, margin threads, selection, editors beside their text, separate drafts, per-comment replies, posting, mobile editor, nineteen light/dark reading palettes in a carousel, text and syntax contrast, six typefaces including the Galley pairing, persisted choices, sticky top bar, settings focus, Viewed progress, Mermaid in the reading palette, enlarged diagrams, sandboxed renderers, source line comments in the comments column, readable test specifications, code comments as notes or as written, folded files, moved code, maps of changed declarations, Escape layers, the optional request description.',
  );
} finally {
  await browser.close();
  server?.close();
}
