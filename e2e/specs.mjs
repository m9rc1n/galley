import assert from 'node:assert/strict';
import { join } from 'node:path';

/** The actual parser frame, test reading view and source comments together in Chrome. */
export async function checkSpecs(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
  await page.evaluate(() =>
    localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper', appearance: 'light', font: 'galley', scope: 'changed', mode: 'changes' })),
  );
  await page.goto(`${demoUrl}/?spec`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.is-case').length === 6);
  const inspect = (fn, ...args) => page.evaluate(fn, ...args);
  const structure = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      suites: s.querySelectorAll('.is-suite').length,
      cases: s.querySelectorAll('.mr-spec-link').length,
      statuses: [...s.querySelectorAll('.is-case .mr-spec-status')].map((el) => el.textContent),
      renamed: [...s.querySelectorAll('[data-title="keeps a separate limit for each client"] .mr-spec-name :is(del, ins)')].map((el) => el.tagName),
      frames: [...s.querySelectorAll('iframe')].map((frame) => `${frame.getAttribute('sandbox')} ${new URL(frame.src).pathname}`).sort(),
      pageFrames: document.querySelectorAll('iframe').length,
      coloured: s.querySelector('.mr-spec-stream .hljs-keyword') !== null,
      threads: s.querySelectorAll('.mr-thread').length,
      folds: s.querySelectorAll('.mr-spec-file .mr-context-toggle').length,
      toc: s.querySelector('.mr-toc').children.length,
      rows: [...s.querySelectorAll('.mr-code-text')].map((el) => [el.dataset.line, el.textContent]),
    };
  });
  assert.equal(structure.suites, 2);
  assert.equal(structure.cases, 6);
  assert.deepEqual(structure.statuses, ['Edited', 'Edited', 'Edited', 'Removed', 'Added', 'Added']);
  // The renamed test reads like an edited sentence: the old words struck out, the new ones marked.
  assert.ok(structure.renamed.includes('DEL') && structure.renamed.includes('INS'), JSON.stringify(structure.renamed));
  assert.deepEqual(structure.frames, ['allow-scripts /build/highlight-frame.html', 'allow-scripts /build/spec-frame.html']);
  assert.equal(structure.pageFrames, 0);
  assert.ok(structure.coloured);
  assert.equal(structure.threads, 1);
  // Changed parts is on, yet a test file folds nothing away.
  assert.equal(structure.folds, 0);
  assert.equal(structure.toc, 0);
  const compact = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return { open: s.querySelector('.mr-spec-browse').open, first: s.querySelector('.is-case .mr-spec-toggle').getBoundingClientRect().bottom };
  });
  assert.equal(compact.open, false, 'The repeated test index starts folded');
  assert.ok(compact.first < 1000, 'The first desktop screen must reach the actual tests');
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-spec-browse summary').focus());
  await page.keyboard.press('Space');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-spec-browse').open), true);
  await page.keyboard.press('Space');
  assert.equal(await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-spec-browse').open), false);
  await page.screenshot({ path: join(screenshots, 'galley-spec-overview.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    [...s.querySelectorAll('.mr-spec-link')].find((link) => link.textContent.startsWith('keeps a separate limit')).click();
  });
  const focused = await inspect(() => document.querySelector('#galley-reader').shadowRoot.activeElement.closest('.mr-spec-section').dataset.title);
  assert.equal(focused, 'keeps a separate limit for each client');
  await page.screenshot({ path: join(screenshots, 'galley-spec-case-desktop.png') });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const line = s.querySelector('.mr-code-text[data-line="h:28"]').closest('.mr-code-line');
    line.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
  });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="comment-block"]').hidden);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-act="comment-block"]').click());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer textarea'));
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const field = s.querySelector('.mr-composer textarea');
    field.value = 'Check both clients have their own quota.';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    s.querySelector('.mr-spec-view-options [data-value="source"]').click();
  });
  const source = await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    return {
      rows: [...s.querySelectorAll('.mr-code-text')].map((el) => [el.dataset.line, el.textContent]),
      visibleRows: [...s.querySelectorAll('.mr-code-text')].filter((el) => el.getClientRects().length).map((el) => [el.dataset.line, el.textContent]),
      draft: s.querySelector('.mr-composer textarea').value,
      heading: getComputedStyle(s.querySelector('.mr-spec-heading')).display,
      pressed: s.querySelector('.mr-spec-view-options [data-value="source"]').getAttribute('aria-pressed'),
      switchVisible: s.querySelector('.mr-spec-view-options [data-value="plan"]').getClientRects().length > 0,
    };
  });
  assert.deepEqual(source.rows, structure.rows);
  assert.deepEqual(source.visibleRows, structure.rows, 'Whole file must show every original source row, including collapsed setup and test wrappers');
  assert.equal(source.draft, 'Check both clients have their own quota.');
  assert.equal(source.heading, 'none');
  assert.equal(source.pressed, 'true');
  assert.ok(source.switchVisible, 'The switch back to the test plan stays available in raw source');
  await page.screenshot({ path: join(screenshots, 'galley-spec-whole-file.png') });
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer .mr-submit').disabled);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-composer').requestSubmit());
  await page.waitForFunction(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-thread.is-own'));
  const posted = await inspect(() => JSON.parse(sessionStorage.getItem('galley:demo-comments')).at(-1));
  assert.equal(posted.startLine, 29);
  assert.equal(posted.side, 'head');
  assert.equal(posted.quote, "    expect(limiter.request('client-b').remaining).toBe(99);");
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-setting="tests"] [data-value="plan"]').click();
    s.querySelector('[data-scope="all"]').click();
    s.querySelector('[data-mode="clean"]').click();
  });
  // Every line of the updated file, and whether Clean shows it.
  const cleanLines = () =>
    inspect(async () => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return {
        rows: [...s.querySelectorAll('.mr-code-line')]
          .filter((row) => row.querySelector('.mr-code-text').dataset.line.startsWith('h:'))
          .map((row) => ({
            text: row.querySelector('.mr-code-text').textContent,
            shown: row.getClientRects().length > 0,
            folded: 'mrSpecBoilerplate' in row.dataset,
            support: Boolean(row.closest('.is-support.is-collapsed')),
          })),
        expected: (await (await fetch('samples/head/src/rate-limits.spec.ts.txt')).text()).replace(/\n$/, '').split('\n'),
        removed: [...s.querySelectorAll('.is-case.is-removed')].every((el) => getComputedStyle(el).display === 'none'),
      };
    });
  const plan = await cleanLines();
  assert.deepEqual(
    plan.rows.map((row) => row.text),
    plan.expected,
  );
  // The plan leaves out only what its headings already say (names, and where bodies open and close) and
  // the spacing between cards. Every other line of every test is there.
  const missing = plan.rows.filter((row) => !row.shown);
  assert.ok(
    missing.every((row) => row.folded || row.support),
    JSON.stringify(missing),
  );
  assert.deepEqual(
    missing.filter((row) => row.text.trim() && !row.support).map((row) => row.text.trim()),
    [
      "describe('Rate limits for batch uploads', () => {",
      'beforeEach(() => {',
      '});',
      "it('accepts requests within the limit', () => {",
      '});',
      "it('rejects requests after the limit is reached', () => {",
      '});',
      "it('keeps a separate limit for each client', () => {",
      '});',
      "describe('When an upload needs more capacity', () => {",
      "it('returns the wait time with a rejected request', () => {",
      '});',
      "it.todo('resets the limit after one minute');",
      '});',
      '});',
    ],
  );
  assert.ok(plan.removed);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-setting="tests"] [data-value="source"]').click());
  const written = await cleanLines();
  assert.ok(
    written.rows.every((row) => row.shown),
    'Clean source must show every line of the updated file',
  );
  assert.ok(written.removed);
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-setting="tests"] [data-value="plan"]').click());
  await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-mode="changes"]').click());
  for (const width of [1440, 1280, 900, 760, 390, 320]) {
    await page.setViewport({ width, height: 844 });
    await inspect(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-root').scrollTo({ top: 0, behavior: 'instant' }));
    const layout = await inspect(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      return {
        page: s.querySelector('.mr-root').scrollWidth,
        first: s.querySelector('.is-case .mr-spec-toggle').getBoundingClientRect().bottom,
        boxes: [...s.querySelectorAll('.mr-spec-plan, .mr-spec-section, .mr-code-lines')]
          .filter((el) => el.getClientRects().length)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return { left: rect.left, right: rect.right, client: el.clientWidth, scroll: el.scrollWidth };
          }),
        buttons: [...s.querySelectorAll('.mr-spec-link')].filter((el) => el.getClientRects().length).map((el) => el.getBoundingClientRect().height),
      };
    });
    assert.ok(layout.page <= width, JSON.stringify({ width, layout }));
    for (const box of layout.boxes) assert.ok(box.left >= 0 && box.right <= width && box.scroll <= box.client + 1, JSON.stringify({ width, box }));
    // Touch-sized on phones; a mouse needs less, and the plan stays compact on wide screens.
    assert.ok(
      layout.buttons.every((height) => height >= (width <= 760 ? 44 : 34)),
      'Test navigation must remain touch-friendly',
    );
    if (width === 390) {
      assert.ok(layout.first < 844, `The first phone screen must reach the actual tests (${layout.first}px)`);
      await page.screenshot({ path: join(screenshots, 'galley-spec-case-mobile.png') });
    }
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await inspect(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    s.querySelector('[data-act="settings"]').click();
    s.querySelector('[data-value="dark"]').click();
    s.querySelector('[data-act="close-settings"]').click();
  });
  await page.screenshot({ path: join(screenshots, 'galley-spec-case-dark.png') });
  assert.deepEqual(errors, []);
  await page.close();
}

/** Code comments read as notes, and as written once Reading settings → Review → Code comments says Source. */
export async function checkCodeComments(browser, demoUrl, screenshots) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${demoUrl}/?closed`, { waitUntil: 'networkidle0' });
  await page.evaluate(() =>
    localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper', appearance: 'light', font: 'galley', codeFiles: true, scope: 'all' })),
  );
  await page.goto(`${demoUrl}/?comments`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#galley-reader')?.shadowRoot.querySelectorAll('.mr-source-comment').length === 2);
  const read = () =>
    page.evaluate(() => {
      const s = document.querySelector('#galley-reader').shadowRoot;
      const shown = (selector) => [...s.querySelectorAll(selector)].filter((el) => el.getClientRects().length).length;
      return {
        labels: [...s.querySelectorAll('.mr-source-comment-meta')].map((el) => el.textContent),
        headings: [...s.querySelectorAll('.mr-source-comment-body h2')].map((el) => el.textContent),
        notes: shown('.mr-source-comment-body'),
        written: shown('.mr-source-comment-source'),
        pressed: s.querySelector('[data-setting="codeComments"] [aria-pressed="true"]').textContent,
        page: s.querySelector('.mr-root').scrollWidth,
      };
    });
  const formatted = await read();
  assert.deepEqual(formatted.labels, ['Doc comment · lines 1–11', 'Comment · line 15']);
  // The old heading sits above the new one, as in any changed document.
  assert.deepEqual(formatted.headings, ['One shared limit', 'A fair limit for each client']);
  assert.deepEqual([formatted.notes, formatted.written, formatted.pressed], [2, 0, 'Formatted']);
  await page.screenshot({ path: join(screenshots, 'galley-code-comments.png') });
  // A code-comment paragraph already has a discussion. Hover still offers the full input invitation,
  // highlights the paragraph, and lets the pointer cross diagonally into the control below the thread.
  await page.evaluate(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const note = s.querySelector('.mr-source-comment-body p:has(ins.mr-ins)');
    s.querySelector('.mr-root').scrollTop += note.getBoundingClientRect().top - 240;
  });
  const note = await page.evaluate(() => {
    const rect = document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-source-comment-body p:has(ins.mr-ins)').getBoundingClientRect();
    return { x: rect.left + 30, y: rect.top + 12, right: rect.right };
  });
  await page.mouse.move(note.x, note.y);
  await page.waitForFunction(() => !document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-comment-btn').hidden);
  const invitation = await page.evaluate(() => {
    const s = document.querySelector('#galley-reader').shadowRoot;
    const button = s.querySelector('.mr-comment-btn');
    const rect = button.getBoundingClientRect();
    return {
      gap: button.classList.contains('is-gap'),
      highlighted: s.querySelector('.mr-source-comment-body p:has(ins.mr-ins)').classList.contains('mr-hovered'),
      label: button.getAttribute('aria-label'),
      left: rect.left,
      top: rect.top,
      x: rect.left + 30,
      y: rect.top + rect.height / 2,
    };
  });
  assert.equal(invitation.gap, false, 'Code keeps the full Add a comment box beside an existing discussion');
  assert.ok(invitation.highlighted, 'The relevant code-comment paragraph highlights as soon as it is hovered');
  assert.equal(invitation.label, 'Comment on lines 4–5');
  await page.mouse.move((note.right + invitation.left) / 2, invitation.y);
  await page.mouse.move(invitation.x, invitation.y);
  assert.equal(await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('.mr-comment-btn').hidden), false);
  await page.screenshot({ path: join(screenshots, 'galley-code-comment-hover.png') });
  await page.mouse.move(12, 80);
  await page.evaluate(() => document.querySelector('#galley-reader').shadowRoot.querySelector('[data-setting="codeComments"] [data-value="source"]').click());
  const written = await read();
  assert.deepEqual([written.notes, written.written, written.pressed], [0, 2, 'Source']);
  // The comment lines as written, in order, with the code around them.
  const lines = await page.evaluate(() =>
    [...document.querySelector('#galley-reader').shadowRoot.querySelectorAll('.mr-code-text')]
      .filter((el) => el.getClientRects().length && el.dataset.line.startsWith('h:'))
      .map((el) => el.textContent),
  );
  const expected = (await (await fetch(`${demoUrl}/samples/head/src/review-notes.ts.txt`)).text()).replace(/\n$/, '').split('\n');
  assert.deepEqual(lines, expected);
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() =>
    document.querySelector('#galley-reader').shadowRoot.querySelector('[data-setting="codeComments"] [data-value="formatted"]').click(),
  );
  assert.ok((await read()).page <= 390, 'Notes must fit a phone');
  await page.screenshot({ path: join(screenshots, 'galley-code-comments-mobile.png') });
  assert.deepEqual(errors, []);
  await page.close();
}
