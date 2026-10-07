import { expect, it, vi } from 'vitest';
import { ReaderError, type CommentPlan, type CommentTarget, type DocContents, type Thread } from '../platforms/types.ts';
import { contents, deferred, guide, readerHarness, review } from '../testing/reader.ts';
import { openReader } from './reader.ts';

const ui = readerHarness();

it('opens a modal, replaces an existing reader, and restores the page focus and scrolling on close', async () => {
  const page = document.createElement('button'); document.body.append(page); page.focus();
  document.documentElement.style.overflow = 'clip';
  const closed = vi.fn();
  await ui.open(review(), { onClose: closed });
  expect(document.documentElement.style.overflow).toBe('hidden');
  expect(ui.q('.mr-root').getAttribute('aria-modal')).toBe('true');
  const second = openReader(review());
  expect(closed).toHaveBeenCalledOnce();
  expect(document.querySelectorAll('#galley-reader')).toHaveLength(1);
  second.close(); second.close();
  expect(document.activeElement).toBe(page);
  expect(document.documentElement.style.overflow).toBe('clip');
  expect(ui.disconnect).toHaveBeenCalledTimes(2);
});

it('renders all documents continuously, folds unchanged context by default, and reveals it locally', async () => {
  const second = { ...guide, path: 'docs/second.md' };
  const source = review({ docs: [guide, second] });
  await ui.open(source);
  expect(source.load).toHaveBeenCalledTimes(2);
  expect(ui.shadow().querySelectorAll('.mr-document')).toHaveLength(2);
  expect(ui.q('.mr-count').textContent).toBe('1 of 2');
  const unchanged = ui.q('.mr-content p');
  expect(unchanged.hidden).toBe(true);
  ui.click('.mr-context-toggle');
  expect(unchanged.hidden).toBe(false);
  ui.click('.mr-context-toggle');
  expect(unchanged.hidden).toBe(true);
  ui.click('[data-scope="all"]');
  expect(unchanged.hidden).toBe(false);
  expect(ui.q('.mr-context-toggle')).toBeNull();
  ui.click('[data-act="files"]');
  expect(ui.q('.mr-files').hidden).toBe(false);
  ui.click('[data-act="doc"][data-doc="1"]');
  expect(ui.q('.mr-file-name').textContent).toBe('second.md');
  expect(ui.q('.mr-files').hidden).toBe(true);
});

it('loads no more than three documents at a time and retains the requested starting file', async () => {
  const pending = Array.from({ length: 5 }, () => deferred<DocContents>());
  const docs = pending.map((_, i) => ({ ...guide, path: `${i}.md` }));
  const load = vi.fn((doc) => pending[docs.indexOf(doc)].promise);
  const handle = openReader(review({ docs, load }), { start: 4 });
  try {
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    pending[0].resolve(contents);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4));
    pending[1].resolve(contents);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(5));
    pending.forEach((p) => { p.resolve(contents); });
    await vi.waitFor(() => expect(ui.q('.mr-skeleton')).toBeNull());
    expect(ui.q('.mr-file-name').textContent).toBe('4.md');
  } finally { handle.close(); }
});

it('keeps other documents readable after a load failure and retries only the failed document', async () => {
  const other = { ...guide, path: 'ok.md' };
  const load = vi.fn().mockRejectedValueOnce(new Error('Rate limit')).mockResolvedValue(contents);
  await ui.open(review({ docs: [guide, other], load }));
  expect(ui.q('.mr-message').textContent).toContain('Rate limit');
  expect(ui.q('.mr-message a').getAttribute('href')).toContain('/diffs');
  expect(ui.q('[data-document="1"] .mr-content')).toBeTruthy();
  ui.click('[data-act="retry-doc"]');
  await vi.waitFor(() => expect(ui.q('.mr-message')).toBeNull());
  expect(load).toHaveBeenCalledTimes(3);
  expect(load.mock.calls[2][0]).toBe(guide);
});

it('offers actionable token errors without inserting error HTML', async () => {
  await ui.open(Promise.reject(new ReaderError('<img onerror=evil()>', 'Save a token', true)));
  expect(ui.q('.mr-message h2').textContent).toBe('<img onerror=evil()>');
  expect(ui.q('.mr-message img')).toBeNull();
  expect(ui.q('.mr-message a').getAttribute('href')).toBe('https://github.com/settings/personal-access-tokens/new');
  ui.click('[data-act="close"]');
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('handles empty reviews and late source resolution after closing', async () => {
  await ui.open(review({ docs: [] }));
  expect(ui.q('.mr-message').textContent).toContain('No readable changes');
  const pending = deferred<ReturnType<typeof review>>();
  const handle = openReader(pending.promise); handle.close();
  const source = review(); pending.resolve(source);
  await pending.promise;
  expect(source.load).not.toHaveBeenCalled();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('loads optional code files only when enabled, after documents, and excludes them from navigation when disabled', async () => {
  const code = { path: 'src/main.ts', oldPath: 'src/main.ts', status: 'modified' as const, kind: 'code' as const };
  const load = vi.fn(async (doc) => doc.kind === 'code' ? { base: 'const count = 1;', head: 'const count = 2;' } : contents);
  await ui.open(review({ codeDocs: [code], load }));
  expect(load).toHaveBeenCalledTimes(1);
  expect(ui.q('[data-document="1"]').hidden).toBe(true);
  ui.click('[data-act="code-files"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-title')).toBeTruthy());
  expect(ui.q('[data-document="1"]').hidden).toBe(false);
  expect(ui.q('.mr-code-title').textContent).toBe('src/main.ts');
  ui.key(']');
  expect(ui.q('.mr-file-name').textContent).toBe('main.ts');
  ui.click('[data-act="code-files"]');
  expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
  ui.key(']');
  expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
});

it('offers settings for a code-only review and ignores enabling code when none is available', async () => {
  await ui.open(review());
  ui.click('[data-act="code-files"]');
  expect(ui.q('[data-act="code-files"]').getAttribute('aria-checked')).toBe('false');
  await ui.open(review({ docs: [], codeDocs: [{ ...guide, path: 'main.py', kind: 'code' }] }));
  expect(ui.q('.mr-empty-reader').hidden).toBe(false);
  expect(ui.q('.mr-file-btn').hidden).toBe(true);
  ui.click('[data-act="code-files"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-title')).toBeTruthy());
  expect(ui.q('.mr-empty-reader').hidden).toBe(true);
});

it('traps focus in settings, persists appearance, and uses Escape to close the drawer before the reader', async () => {
  await ui.open(review());
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-main').inert).toBe(true);
  expect(ui.shadow().activeElement).toBe(ui.q('button[data-act="close-settings"]'));
  ui.key('Tab', { shiftKey: true });
  expect(ui.shadow().activeElement?.tagName).toBe('SUMMARY');
  ui.key('Tab');
  expect(ui.shadow().activeElement).toBe(ui.q('button[data-act="close-settings"]'));
  ui.click('[data-value="dark"]'); ui.click('[data-value="sans"]'); ui.click('[data-mode="clean"]');
  for (let i = 0; i < 8; i++) ui.click('[data-act="larger"]');
  expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('24px');
  for (let i = 0; i < 8; i++) ui.click('[data-act="smaller"]');
  expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('17px');
  expect(ui.q('.mr-root').classList).toContain('is-dark');
  expect(JSON.parse(localStorage.getItem('galley:settings')!).font).toBe('sans');
  ui.key('Escape');
  expect(ui.q('.mr-main').inert).toBe(false);
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="settings"]'));
  ui.key('Escape');
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('shields page shortcuts while respecting text input and modifier keys', async () => {
  const pageKey = vi.fn(); window.addEventListener('keydown', pageKey);
  try {
    await ui.open(review());
    ui.key('c', { ctrlKey: true }); expect(ui.q('.mr-root').classList).toContain('mode-changes');
    ui.key('c'); expect(ui.q('.mr-root').classList).toContain('mode-clean');
    ui.key('c'); expect(ui.q('.mr-root').classList).toContain('mode-changes');
    ui.key('+'); expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('22px');
    ui.key('-'); expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('20px');
    await ui.commentOn();
    ui.key('c'); expect(ui.q('.mr-root').classList).toContain('mode-changes');
    expect(pageKey).not.toHaveBeenCalled();
    ui.close();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(pageKey).toHaveBeenCalledOnce();
  } finally { window.removeEventListener('keydown', pageKey); }
});

it('holds external document and thread images until an explicit action, with consent remembered', async () => {
  const img = '![pixel](https://tracker.example/a.png)';
  const thread: Thread = { doc: guide, side: 'head', line: null, url: '#thread', comments: [{ author: 'Reviewer', body: img, createdAt: new Date().toISOString(), url: '#thread' }] };
  await ui.open(review({ load: async () => ({ base: '', head: `# Guide\n\n${img}` }), loadThreads: async () => [thread] }));
  expect(ui.shadow().querySelectorAll('img[data-mr-src]')).toHaveLength(2);
  expect(ui.q('img').getAttribute('src')).toBeNull();
  ui.click('[data-act="load-images"]');
  expect(ui.shadow().querySelectorAll('img[data-mr-src]')).toHaveLength(0);
  expect(ui.q('img').getAttribute('src')).toBe('https://tracker.example/a.png');
  await ui.open(review({ load: async () => ({ base: '', head: img }) }));
  ui.click('[data-value="load"]');
  expect(ui.q('img').getAttribute('src')).toBe('https://tracker.example/a.png');
  expect(JSON.parse(localStorage.getItem('galley:settings')!).images).toBe('load');
});

it('navigates change targets and headings without following the platform page links', async () => {
  const head = '# Guide\n\n## First\n\nNew one.\n\n## Second\n\nNew two.\n\n## Third\n\nNew three.\n';
  await ui.open(review({ load: async () => ({ base: head.replaceAll('New', 'Old'), head }) }));
  const changes = [...ui.shadow().querySelectorAll<HTMLElement>('[data-mr-change]')];
  changes.forEach((el, i) => { ui.bounds(el, 400 + i * 100); });
  ui.key('j'); const first = ui.scroll.mock.calls.at(-1)?.[0].top;
  ui.key('j'); expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBeGreaterThan(first);
  ui.key('k'); expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBe(first);
  ui.click('[data-act="heading"]');
  expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBeGreaterThan(0);
  ui.flushFrame();
  expect(ui.q('.mr-pill').hidden).toBe(false);
  ui.click('[data-act="mark"]');
  expect(changes.some((el) => el.classList.contains('mr-flash'))).toBe(true);
});

it('does not treat a failed native viewed write as saved and lets the reader retry explicitly', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValue(undefined);
  await ui.open(review({ viewed: { label: 'Saved on GitHub', load: async () => [], set: save } }));
  await ui.readyViewed(); ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed-feedback').textContent).toBe('Permission denied'));
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false');
  expect(save).toHaveBeenCalledOnce();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(ui.q('.mr-viewed-feedback').hidden).toBe(true);
  expect(ui.q('.mr-files-progress').textContent).toBe('1 of 1 viewed');
  ui.key('v');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false'));
  expect(save.mock.calls.at(-1)).toEqual([guide, false]);
});

it('retries loading native progress without marking a file viewed prematurely', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([guide.path]);
  const set = vi.fn();
  await ui.open(review({ viewed: { label: 'GitHub', load, set } }));
  await ui.readyViewed();
  expect(ui.q('.mr-viewed').title).toContain('Retry loading viewed state');
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(set).not.toHaveBeenCalled();
});

it('persists local viewed progress across reopening without storing document text', async () => {
  await ui.open(review()); await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(Object.keys(localStorage).join()).not.toContain('guide.md');
  await ui.open(review()); await ui.readyViewed();
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true');
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false'));
});

it('selects a precise paragraph target and posts only once while a request is pending', async () => {
  const pending = deferred<{ url: string }>();
  const post = vi.fn(() => pending.promise);
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'GitLab inline comment', post }));
  await ui.open(review({ prepareComment: prepare }));
  expect(ui.q('.mr-composer').hidden).toBe(true);
  await ui.commentOn();
  expect(prepare.mock.calls[0][0]).toEqual({ doc: guide, side: 'head', startLine: 5, endLine: 5, quote: 'The limit is 20 euros.' });
  expect(ui.q('.mr-comment-target').textContent).toBe('docs/guide.md · new text, line 5');
  ui.input('   '); expect(ui.q<HTMLButtonElement>('.mr-submit').disabled).toBe(true);
  ui.input('Please explain the new limit.');
  ui.q('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  ui.q('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  ui.click('[data-act="cancel-comment"]'); ui.key('Escape');
  expect(ui.q('.mr-composer').hidden).toBe(false);
  expect(post).toHaveBeenCalledExactlyOnceWith('Please explain the new limit.');
  expect(ui.q<HTMLTextAreaElement>('#mr-comment').disabled).toBe(true);
  pending.resolve({ url: `${location.origin}/thread/7` });
  await vi.waitFor(() => expect(ui.q('.mr-composer').hidden).toBe(true)); ui.flushFrame();
  expect(ui.q('.mr-thread.is-own').textContent).toContain('Please explain the new limit.');
  expect(ui.q('.mr-toast a').getAttribute('href')).toBe(`${location.origin}/thread/7`);
  expect(ui.q('.mr-targeted')).toBeNull();
});

it('keeps a draft on Escape and on posting failure, with no automatic write retry', async () => {
  const post = vi.fn().mockRejectedValueOnce(new ReaderError('Revision changed.', 'Reload the review.')).mockResolvedValue({ url: '#posted' });
  await ui.open(review({ prepareComment: async () => ({ kind: 'inline', label: 'Inline', post }) }));
  await ui.commentOn(); ui.input('Keep this draft'); ui.key('Escape');
  expect(ui.q('.mr-comment-status').textContent).toContain('Draft kept');
  expect(ui.q<HTMLTextAreaElement>('#mr-comment').value).toBe('Keep this draft');
  ui.click('.mr-submit');
  await vi.waitFor(() => expect(ui.q('.mr-comment-status').textContent).toContain('Reload the review'));
  expect(post).toHaveBeenCalledOnce();
  expect(ui.q<HTMLTextAreaElement>('#mr-comment').value).toBe('Keep this draft');
  expect(ui.q<HTMLButtonElement>('.mr-submit').disabled).toBe(false);
  ui.click('[data-act="cancel-comment"]');
  expect(ui.q<HTMLTextAreaElement>('#mr-comment').value).toBe('');
  expect(ui.q('.mr-composer').hidden).toBe(true);
});

it('ignores stale comment preparation after cancelling or choosing another paragraph', async () => {
  const stale = deferred<CommentPlan>();
  const post = vi.fn(async () => ({ url: '#current' }));
  const stalePost = vi.fn(async () => ({ url: '#stale' }));
  const prepare = vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValue({ kind: 'inline', label: 'Current target', post });
  await ui.open(review({ prepareComment: prepare }));
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  ui.click('[data-act="comment-block"]'); ui.click('[data-act="cancel-comment"]');
  await ui.commentOn('.mr-content h1');
  stale.resolve({ kind: 'file', label: 'Stale target', post: stalePost }); await stale.promise;
  expect(ui.q('.mr-comment-status').textContent).toContain('Current target');
  ui.input('Draft'); ui.click('.mr-submit');
  await vi.waitFor(() => expect(ui.q('.mr-composer').hidden).toBe(true));
  expect(post).toHaveBeenCalledExactlyOnceWith('Draft');
  expect(stalePost).not.toHaveBeenCalled();
});

it('surfaces unavailable commenting and preparation failures without enabling submission', async () => {
  await ui.open(review()); await ui.commentOn(); ui.input('Draft');
  expect(ui.q('.mr-comment-status').textContent).toContain('unavailable');
  expect(ui.q<HTMLButtonElement>('.mr-submit').disabled).toBe(true);
  await ui.open(review({ prepareComment: async () => { throw new Error('Write scope missing'); } }));
  await ui.commentOn();
  expect(ui.q('.mr-comment-status').textContent).toBe('Write scope missing');
  expect(ui.q<HTMLButtonElement>('.mr-submit').disabled).toBe(true);
  ui.key('Escape'); expect(ui.q('.mr-composer').hidden).toBe(true);
});

it('anchors and sanitises existing threads, preserving context and folding long conversations', async () => {
  const comments = Array.from({ length: 5 }, (_, i) => ({ author: `Reviewer ${i}`, body: i === 0 ? '<script>bad()</script>\n\n![pixel](https://tracker.example/p.gif)' : `Reply ${i}`, createdAt: new Date(Date.now() - 86400_000 * i).toISOString(), url: '#thread' }));
  const thread: Thread = { doc: guide, side: 'head', line: 3, resolved: true, outdated: true, url: 'javascript:alert(1)', comments };
  await ui.open(review({ loadThreads: async () => [thread, { ...thread, line: null, url: `${location.origin}/thread` }, { ...thread, line: 2, url: 'https://elsewhere.example/thread' }] }));
  ui.flushFrame();
  expect(ui.q('.mr-content p').hidden).toBe(false);
  expect(ui.shadow().querySelectorAll('.mr-thread')).toHaveLength(3);
  expect([...ui.shadow().querySelectorAll('.mr-thread-link')].map((a) => a.getAttribute('href'))).toEqual([`${location.origin}/thread`]);
  expect(ui.q('.mr-thread script')).toBeNull();
  expect(ui.q('.mr-thread img').getAttribute('src')).toBeNull();
  expect(ui.q('.mr-thread.is-resolved').textContent).toContain('Outdated');
  expect(ui.q('.mr-thread a[href^="javascript"]')).toBeNull();
  ui.click('[data-act="toggle-thread"]');
  expect(ui.q('.mr-thread').classList).toContain('is-expanded');
  ui.click('[data-act="toggle-thread"]');
  expect(ui.q('[data-act="toggle-thread"]').textContent).toBe('3 more replies');
  ui.bounds(ui.q('.mr-article'), 100, 100); ui.q('.mr-root').dispatchEvent(new Event('galley:context')); ui.flushFrame();
  expect(ui.q('.mr-content .mr-thread')).toBeTruthy();
});

it('continues reading when loading threads fails', async () => {
  await ui.open(review({ loadThreads: async () => { throw new Error('Offline'); } }));
  expect(ui.q('.mr-content')).toBeTruthy();
  expect(ui.q('.mr-message')).toBeNull();
});

it('offers a selected quote without opening the composer until requested and cancels it with Escape', async () => {
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open(review({ prepareComment: prepare }));
  const selected = ui.q('.mr-content ins');
  const range = document.createRange(); range.selectNodeContents(selected);
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  selected.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  expect(ui.q('.mr-composer').hidden).toBe(true);
  ui.key('Escape'); expect(ui.q('.mr-select-chip').hidden).toBe(true);
  selected.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  ui.click('[data-act="comment-selection"]');
  await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  expect(prepare.mock.calls[0][0]).toMatchObject({ side: 'head', startLine: 5, endLine: 5, quote: '20' });
  expect(ui.q('.mr-comment-quote').textContent).toBe('20');
  expect(ui.q('.mr-composer').hidden).toBe(false);
});

it('prevents a selection spanning old and new text from being posted against one version', async () => {
  await ui.open(review());
  const paragraph = ui.q('[data-mr-change="modified"]');
  const range = document.createRange(); range.selectNodeContents(paragraph);
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q<HTMLButtonElement>('.mr-select-chip').disabled).toBe(true);
  expect(ui.q('.mr-select-chip').title).toContain('one version');
  selection.isCollapsed = true; document.dispatchEvent(new Event('selectionchange'));
  ui.key('Escape'); expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('comments on the paragraph in focus with R and submits with Ctrl+Enter without page shortcuts', async () => {
  const post = vi.fn(async () => ({ url: '#posted' }));
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post }));
  await ui.open(review({ prepareComment: prepare }));
  ui.bounds(ui.q('h1'), 80); ui.bounds(ui.q('[data-mr-change="modified"]'), 230);
  ui.key('r'); await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  expect(prepare.mock.calls[0][0].startLine).toBe(5);
  ui.flushFrame(); ui.input('Review via keyboard'); ui.key('Enter', { ctrlKey: true });
  await vi.waitFor(() => expect(ui.q('.mr-composer').hidden).toBe(true));
  expect(post).toHaveBeenCalledExactlyOnceWith('Review via keyboard');
});

it('uses the old path and source coordinates when commenting on a removed file', async () => {
  const removed = { path: 'docs/new.md', oldPath: 'docs/old.md', status: 'removed' as const };
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Old version', post: vi.fn() }));
  await ui.open(review({ docs: [removed], load: async () => ({ base: '# Retired\n\nOld guidance.\n', head: '' }), prepareComment: prepare }));
  expect(ui.q('.mr-banner').textContent).toContain('deleted');
  await ui.commentOn('.mr-content p');
  expect(prepare.mock.calls[0][0]).toMatchObject({ doc: removed, side: 'base', startLine: 3, endLine: 3 });
  expect(ui.q('.mr-comment-target').textContent).toContain('docs/old.md · old text');
});

it('reflects renamed and unchanged documents and warns about edits that Markdown cannot show', async () => {
  const renamed = { ...guide, oldPath: 'old.md', status: 'renamed' as const };
  await ui.open(review({ docs: [renamed], load: async () => ({ base: 'Same.', head: 'Same.' }) }));
  expect(ui.q('.mr-file-btn').title).toBe('Renamed: old.md → docs/guide.md');
  expect(ui.q('.mr-byline').textContent).toContain('Moved, text unchanged');
  expect(ui.q('.mr-empty-changes')).toBeTruthy();
  await ui.open(review({ load: async () => ({ base: 'Text.\n\n<!-- old -->', head: 'Text.\n\n<!-- changed -->' }) }));
  expect(ui.q('.mr-chip.is-hidden').textContent).toContain('2 lines not shown');
  expect(ui.q('.mr-chip.is-hidden').getAttribute('href')).toContain('/diffs');
});

it('restores automatic colour scheme behavior and responds to system theme changes', async () => {
  await ui.open(review());
  ui.click('[data-value="sepia"]'); expect(ui.q('.mr-root').classList).toContain('is-sepia');
  ui.click('[data-value="auto"]');
  Object.defineProperty(ui.media, 'matches', { value: true }); ui.media.dispatchEvent(new Event('change'));
  expect(ui.q('.mr-root').classList).toContain('is-dark');
  ui.click('[data-value="light"]'); ui.media.dispatchEvent(new Event('change'));
  expect(ui.q('.mr-root').classList).not.toContain('is-dark');
});

it('updates the current file and progress indicator on scrolling, and follows document anchors locally', async () => {
  const head = '# Guide\n\n[Jump](#review-context)\n\n## Review context\n\nKept.\n';
  await ui.open(review({ docs: [guide, { ...guide, path: 'other.md' }], load: async () => ({ base: head.replace('Jump', 'Go'), head }) }));
  ui.click('[data-scope="all"]');
  expect(ui.q('.mr-content h2').id).toBe('user-content-review-context');
  ui.click('.mr-content a[href="#review-context"]');
  expect(ui.scroll).toHaveBeenCalledWith({ top: 204, behavior: 'smooth' });
  const root = ui.q('.mr-root');
  Object.defineProperty(root, 'scrollHeight', { value: 1600 }); root.scrollTop = 400;
  ui.bounds(ui.q('[data-document="1"]'), 100);
  root.dispatchEvent(new Event('scroll')); ui.flushFrame();
  expect(ui.q('.mr-file-name').textContent).toBe('other.md');
  expect(ui.q('.mr-progress > div').style.transform).toBe('scaleX(0.5)');
  expect(ui.q('.mr-topbar').classList).toContain('is-scrolled');
  ui.key('['); expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
});

it('loads an individually held image only on its explicit button', async () => {
  await ui.open(review({ load: async () => ({ base: '', head: '![first](https://one.example/p.png)\n\n![second](https://two.example/p.png)' }) }));
  ui.click('[data-act="load-image"]');
  expect(ui.q('img').getAttribute('src')).toBe('https://one.example/p.png');
  expect(ui.q('img[data-mr-src]').getAttribute('src')).toBeNull();
  expect(ui.q('[data-act="load-images"]')).toBeTruthy();
});
