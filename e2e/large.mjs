import assert from 'node:assert/strict';
import { join } from 'node:path';

/** A larger review in Chrome: folded files, code moved between files, and the map of changed declarations. */
export async function checkLargeReview(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
  await page.evaluate(() =>
    localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper', appearance: 'light', font: 'galley', codeFiles: true, mode: 'changes' })),
  );
  await page.goto(`${demoUrl}/?large`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-symbol-plan').length === 2);
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const overview = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const texts = (selector) => [...s.querySelectorAll(selector)].map((el) => el.textContent);
    const background = (el) => getComputedStyle(el).backgroundColor;
    const moved = s.querySelector('.mr-code-line[data-mr-moved][data-mr-change="removed"]');
    const removed = s.querySelector('.mr-code-line[data-mr-change="removed"]:not([data-mr-moved])');
    return {
      folded: texts('.mr-quiet-name'),
      labels: texts('.mr-quiet-label'),
      moves: texts('.mr-move-link'),
      chips: texts('.mr-chip.is-moved'),
      plans: [...s.querySelectorAll('.mr-symbol-plan')].map((plan) =>
        [...plan.querySelectorAll('.mr-spec-link')].map((link) => `${link.querySelector('.mr-spec-name').textContent} ${link.dataset.status}`),
      ),
      tinted: background(moved) !== background(removed) && background(moved) !== 'rgba(0, 0, 0, 0)',
      comment: getComputedStyle(s.querySelector('.mr-source-comment:has([data-mr-moved]) .mr-ghost'), '::before').content,
    };
  });
  assert.deepEqual(overview.folded, ['docs/guides/limits.md', 'package-lock.json', 'src/legacy/format.ts', 'dist/limits.min.js']);
  assert.deepEqual(overview.labels, ['Renamed', 'Lockfile', 'Whitespace only', 'Minified']);
  assert.deepEqual(overview.moves, ['Moved to src/limits/quota.ts, line 3', 'Moved from src/limits/rate-limiter.ts, old line 18']);
  assert.deepEqual(overview.chips, ['6 moved', '6 moved']);
  assert.deepEqual(overview.plans, [
    ['createRateLimiter edited', 'remaining moved', 'resetAll removed', 'describeLimit edited', 'Window added', 'Outside declarations edited'],
    ['remaining moved', 'retryAfter added', 'Outside declarations added'],
  ]);
  assert.ok(overview.tinted, 'Moved lines have a tint of their own');
  assert.equal(overview.comment, '"Moved"');
  await page.screenshot({ path: join(screenshots, 'galley-large-plan.png') });

  // A move note goes to the other end, and a declaration link to its first changed line.
  const jumps = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const links = [...s.querySelectorAll('.mr-move-link')];
    links[0].click();
    const target = links[1].getBoundingClientRect();
    const move = { focused: s.activeElement === links[1], visible: target.top > 0 && target.bottom < innerHeight };
    [...s.querySelectorAll('.mr-symbol-plan .mr-spec-link')].find((link) => link.textContent.includes('resetAll')).click();
    const flashed = s.querySelector('.mr-code-line.is-flash').getBoundingClientRect();
    return { move, line: flashed.top > 0 && flashed.bottom < innerHeight };
  });
  assert.deepEqual(jumps, { move: { focused: true, visible: true }, line: true });
  await page.screenshot({ path: join(screenshots, 'galley-large-moved.png') });

  // Show changes opens a folded file in place.
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-document.is-quiet [data-act="show-quiet"]').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-quiet').length === 3);
  const opened = await inspect(
    () => document.querySelector('#galley-reader').shadowRoot.querySelector('[aria-label="docs/guides/limits.md"] .mr-byline').textContent,
  );
  assert.ok(opened.includes('Moved, text unchanged'), opened);

  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 844 });
    const layout = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return {
        page: s.querySelector('.mr-root').scrollWidth,
        boxes: [...s.querySelectorAll('.mr-quiet, .mr-symbol-plan, .mr-move-note')].map((el) => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }),
        buttons: [...s.querySelectorAll('.mr-quiet-show')].map((el) => el.getBoundingClientRect().height),
      };
    });
    assert.ok(layout.page <= width, JSON.stringify({ width, page: layout.page }));
    for (const box of layout.boxes) assert.ok(box.left >= 0 && box.right <= width, JSON.stringify({ width, box }));
    if (width === 390) {
      assert.ok(
        layout.buttons.every((height) => height >= 44),
        'Show changes stays touch-sized on phones',
      );
      await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-document.is-quiet').scrollIntoView());
      await page.screenshot({ path: join(screenshots, 'galley-large-folded-mobile.png') });
    }
  }
  assert.deepEqual(errors, []);
  await page.close();
}
