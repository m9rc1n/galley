import { expect, it, vi } from 'vitest';
import type { CommentPlan, DocContents, Thread } from '../platforms/types.ts';
import { contents, deferred, guide, readerHarness, review } from '../testing/reader.ts';
import { openReader } from './reader.ts';

const ui = readerHarness();
const thread = (line: number | null, patch: Partial<Thread> = {}): Thread => ({
  doc: guide,
  side: 'head',
  line,
  url: '#thread',
  comments: [{ author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' }],
  ...patch,
});
const pointer = (target: Element, type: string, x = 400, y = 80, pointerType = 'touch') => {
  const e = new MouseEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  target.dispatchEvent(e);
};

it.each([new Error('Offline'), 'Network unavailable'])('shows unexpected review failures as text: %s', async (err) => {
  await ui.open(Promise.reject(err));
  expect(ui.q('.mr-message').textContent).toContain('Galley could not load this review');
  expect(ui.q('.mr-message').textContent).toContain(err instanceof Error ? err.message : err);
});

it.each([true, false])('ignores a document response after closing, success=%s', async (success) => {
  const pending = deferred<DocContents>(),
    load = vi.fn(() => pending.promise);
  const handle = openReader(review({ load }));
  await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  handle.close();
  if (success) pending.resolve(contents);
  else pending.reject('Offline');
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('ignores a source rejection and thread response that arrive after closing', async () => {
  const source = deferred<ReturnType<typeof review>>();
  openReader(source.promise).close();
  source.reject('Offline');
  await ui.tick();
  const threads = deferred<Thread[]>();
  await ui.open(review({ loadThreads: () => threads.promise }));
  ui.close();
  threads.resolve([thread(5)]);
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('does not issue duplicate loads while a failed file is being retried', async () => {
  const pending = deferred<DocContents>();
  const load = vi.fn().mockRejectedValueOnce('No response').mockReturnValueOnce(pending.promise);
  await ui.open(review({ load }));
  expect(ui.q('.mr-message').textContent).toContain('No response');
  ui.click('[data-act="retry-doc"]');
  ui.click('[data-act="retry-doc"]');
  expect(load).toHaveBeenCalledTimes(2);
  pending.resolve(contents);
  await vi.waitFor(() => expect(ui.q('.mr-content')).toBeTruthy());
});

it.each([new Error('Storage unavailable'), 'Storage unavailable'])(
  'retries local viewed-state failures without prematurely marking a file: %s',
  async (err) => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key.startsWith('galley:viewed:')) throw err;
      return null;
    });
    await ui.open(review());
    await vi.waitFor(() => expect(ui.q('.mr-viewed-feedback').textContent).toBe('Storage unavailable'));
    expect(ui.q('.mr-viewed').title).toContain('Retry loading');
    get.mockReturnValue(null);
    ui.click('[data-act="viewed"]');
    await vi.waitFor(() => expect(ui.q('.mr-viewed').title).toContain('Mark as viewed'));
    expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false');
  },
);

it('keeps viewed writes single while pending and ignores their completion after closing', async () => {
  const pending = deferred<void>(),
    set = vi.fn(() => pending.promise);
  await ui.open(review({ viewed: { label: 'GitHub', load: async () => [], set } }));
  await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  expect(ui.q('.mr-viewed').title).toContain('Saving');
  ui.key('v');
  ui.q('.mr-viewed').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(set).toHaveBeenCalledOnce();
  ui.close();
  pending.resolve();
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('shares a native viewed retry in flight and shows non-Error load and write failures', async () => {
  const pending = deferred<string[]>(),
    load = vi.fn().mockRejectedValueOnce('Offline').mockReturnValue(pending.promise);
  const set = vi.fn().mockRejectedValue('Write denied');
  await ui.open(review({ viewed: { label: 'GitHub', load, set } }));
  await vi.waitFor(() => expect(ui.q('.mr-viewed-feedback').textContent).toBe('Offline'));
  ui.click('[data-act="viewed"]');
  ui.q('.mr-viewed').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(load).toHaveBeenCalledTimes(2);
  pending.resolve([]);
  await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed-feedback').textContent).toBe('Write denied'));
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false');
});

it('ignores native viewed loading that finishes after closing', async () => {
  const pending = deferred<string[]>();
  await ui.open(review({ viewed: { label: 'GitHub', load: () => pending.promise, set: vi.fn() } }));
  ui.close();
  pending.resolve([guide.path]);
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('shows front-matter descriptions, whole-file additions, source labels, and singular hidden changes', async () => {
  const added = { ...guide, status: 'added' as const };
  await ui.open(review({ docs: [added], load: async () => ({ base: '', head: '---\ntitle: Guide\nsummary: A useful guide\n---\n# Guide\n\nText.\n' }) }));
  expect(ui.q('.mr-subtitle').textContent).toBe('A useful guide');
  expect(ui.q('.mr-byline').textContent).toContain('New document');
  await ui.open(review({ load: async () => ({ base: '# Guide\n', head: '# Guide\n\n<!-- New hidden comment -->\n' }) }));
  expect(ui.q('.is-hidden').textContent).toBe('1 line not shown');
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const code = { path: 'app.dart', oldPath: 'app.dart', status: 'added' as const, kind: 'code' as const };
  await ui.open(review({ docs: [], codeDocs: [code], load: async () => ({ base: '', head: 'main() {}' }) }));
  expect(ui.q('.mr-byline').textContent).toContain('Source file');
  expect(ui.q('.mr-byline').textContent).toContain('New file');
});

it('opens and dismisses file and palette menus on a narrow screen and honours reduced motion', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(700);
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  await ui.open(review());
  ui.click('[data-act="files"]');
  expect(ui.q('.mr-files').style.left).not.toBe('');
  ui.click('[data-act="files"]');
  expect(ui.q('.mr-files').hidden).toBe(true);
  ui.key('j');
  expect(ui.scroll).toHaveBeenLastCalledWith({ top: 60, behavior: 'auto' });
  ui.click('[data-act="settings"]');
  ui.click('[data-act="palette-next"]');
  expect(ui.scroll).toHaveBeenLastCalledWith({ left: 700, behavior: 'auto' });
  const track = ui.q('.mr-palette-track');
  track.scrollLeft = 700;
  track.dispatchEvent(new Event('scroll'));
  ui.click('[data-act="palette-prev"]');
  expect(ui.scroll).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-settings').hidden).toBe(true);
});

it('keeps keyboard focus inside the reader and lets unrelated page controls receive their keys', async () => {
  const outside = document.createElement('input');
  document.body.append(outside);
  await ui.open(review());
  const page = vi.fn();
  outside.addEventListener('keydown', page);
  outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
  expect(page).toHaveBeenCalledOnce();
  ui.scroll.mockClear();
  ui.key('z');
  ui.key('Enter', { ctrlKey: true });
  expect(ui.scroll).not.toHaveBeenCalled();
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
  expect(ui.scroll).toHaveBeenCalledOnce();
  document.documentElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', bubbles: true }));
  ui.q('.mr-root').focus();
  ui.key('Tab');
  const first = ui.shadow().activeElement;
  ui.key('Tab');
  ui.key('Tab', { shiftKey: true });
  expect(ui.shadow().activeElement).toBe(first);
  ui.key('Tab', { shiftKey: true });
  expect(ui.shadow().activeElement).not.toBe(first);
  ui.key(',');
  ui.q('[data-settings-tab="reading"]').focus();
  ui.key('ArrowLeft');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="keys"]'));
  ui.key('Home');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="reading"]'));
});

it('chooses palette pages directly and stops the next-change button at the final change', async () => {
  await ui.open(review());
  ui.key(',');
  ui.scroll.mockClear();
  ui.click('.mr-carousel-dot[data-page="3"]');
  expect(ui.q('.mr-carousel-dot[data-page="3"]').getAttribute('aria-current')).toBe('true');
  expect(ui.q<HTMLButtonElement>('[data-act="palette-next"]').disabled).toBe(true);
  expect(ui.q<HTMLButtonElement>('[data-act="palette-prev"]').disabled).toBe(false);
  expect(ui.scroll).toHaveBeenLastCalledWith({ left: 3840, behavior: 'smooth' });
  ui.key('Escape');
  ui.scroll.mockClear();
  ui.bounds(ui.q('[data-mr-change="modified"]'), 300);
  ui.click('[data-act="next"]');
  ui.click('[data-act="next"]');
  expect(ui.scroll.mock.calls.map(([options]) => options.top)).toEqual([60]);
});

it('offers a compact comment control beside the text when conversations fill its margin', async () => {
  await ui.open(review({ loadThreads: async () => [thread(5)] }));
  const card = ui.q('.mr-threads .mr-thread');
  Object.defineProperty(card, 'offsetTop', { value: 0 });
  Object.defineProperty(card, 'offsetHeight', { value: 200 });
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.q('.mr-comment-btn').classList).toContain('is-gap');
  expect(ui.q('.mr-comment-btn').hidden).toBe(false);
  expect(ui.q('.mr-comment-btn').style.top).toBe('20px');
  ui.click('[data-act="comment-block"]');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-composer textarea'));
});

it('reveals a hidden anchor locally and leaves missing or empty anchors alone', async () => {
  const base = '# Guide\n\n[Jump](#hidden)\n\n## Hidden\n\nStable.\n\n## Edited\n\nValue 10.\n';
  await ui.open(review({ load: async () => ({ base, head: base.replace('Value 10', 'Value 20').replace('Jump', 'Jump now') }) }));
  ui.scroll.mockClear();
  ui.click('a[href="#hidden"]');
  expect(ui.q('h2').hidden).toBe(false);
  expect(ui.scroll).toHaveBeenCalledOnce();
  const link = ui.q<HTMLAnchorElement>('a[href="#hidden"]');
  link.href = '#missing';
  link.click();
  link.href = '#';
  link.click();
  expect(ui.scroll).toHaveBeenCalledOnce();
});

it('offers touch comments below a tap near the top and hides them when scrolling or tapping elsewhere', async () => {
  await ui.open(review());
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => ({ isCollapsed: true }) });
  const block = ui.q('[data-mr-change="modified"]');
  pointer(block, 'pointerup');
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  expect(ui.q('.mr-select-chip').style.top).toBe('90px');
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  pointer(block, 'pointerup', 400, 300);
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  pointer(ui.q('.mr-byline'), 'pointerup');
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  pointer(block, 'pointerup', 400, 300, 'mouse');
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('ignores touch gestures on controls and while selecting text', async () => {
  await ui.open(review({ load: async () => ({ base: '', head: '# Guide\n\n[Link](https://example.com)\n' }) }));
  const selection = { isCollapsed: true };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  pointer(ui.q('.mr-content a'), 'pointerup');
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  selection.isCollapsed = false;
  pointer(ui.q('h1'), 'pointerup');
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('keeps a touch comment available when a pending editor layout finishes without scrolling', async () => {
  const prepare = vi.fn(async (): Promise<CommentPlan> => ({ kind: 'inline', label: 'Inline', post: vi.fn() }));
  await ui.open(review({ prepareComment: prepare }));
  await ui.commentOn();
  ui.key('Escape');
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => ({ isCollapsed: true }) });
  pointer(ui.q('[data-mr-change="modified"]'), 'pointerup', 400, 300);
  await ui.tick();
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  // Closing the previous editor queued a layout frame, just as in the browser touch check.
  ui.flushFrame();
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  ui.click('.mr-select-chip');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-composer textarea'));
  expect(prepare).toHaveBeenLastCalledWith(expect.objectContaining({ doc: guide, side: 'head', startLine: 5, quote: 'The limit is 20 euros.' }));
});

it('captures keyboard selections, highlights quotes, repositions the chip, and clears it on deselection', async () => {
  vi.stubGlobal(
    'Highlight',
    class {
      constructor(...publicRanges: Range[]) {
        this.ranges = publicRanges;
      }
      ranges: Range[];
    },
  );
  await ui.open(review());
  const range = document.createRange();
  range.selectNodeContents(ui.q('ins.mr-ins'));
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  ui.q('ins.mr-ins').dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true, composed: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  ui.click('[data-act="comment-selection"]');
  expect(CSS.highlights.has('galley-quote')).toBe(true);
  ui.click('.mr-composer .mr-cancel');
  expect(CSS.highlights.has('galley-quote')).toBe(false);
  ui.q('ins.mr-ins').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  selection.isCollapsed = true;
  document.dispatchEvent(new Event('selectionchange'));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('rejects a selection across files or inside a thread and ignores empty selection events', async () => {
  const other = { ...guide, path: 'other.md' };
  await ui.open(review({ docs: [guide, other], loadThreads: async () => [thread(5)] }));
  const range = document.createRange();
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  range.setStart(ui.q('[data-document="0"] h1'), 0);
  range.setEnd(ui.q('[data-document="1"] h1'), 1);
  ui.q('[data-document="0"] h1').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  range.selectNodeContents(ui.q('.mr-thread-body'));
  ui.q('.mr-root').dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true, composed: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  selection.rangeCount = 0;
  ui.q('h1').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  ui.q('.mr-topbar').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('uses natural or fallback diagram dimensions and safely ignores an empty zoom control', async () => {
  await ui.open(review());
  const zoom = document.createElement('button');
  zoom.dataset.act = 'zoom-diagram';
  ui.q('.mr-content').append(zoom);
  zoom.click();
  expect(ui.q('.mr-lightbox').hidden).toBe(true);
  const image = document.createElement('img');
  image.src = 'data:image/svg+xml,%3Csvg/%3E';
  zoom.append(image);
  zoom.click();
  expect(ui.q('.mr-lightbox img').style.width).toBe('996px');
  ui.click('[data-act="close-lightbox"]');
  Object.defineProperties(image, { naturalWidth: { value: 700 }, naturalHeight: { value: 400 } });
  zoom.click();
  expect(ui.q('.mr-lightbox img').style.width).toBe('1162px');
});

it('shows compact comment controls outside the rail and suppresses them when the margin is too narrow', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1050);
  await ui.open(review());
  const p = ui.q('[data-mr-change="modified"]');
  p.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.q('.mr-comment-btn').textContent).toBe('Comment');
  expect(ui.q('.mr-comment-btn').classList).toContain('is-compact');
  expect(ui.q('.mr-comment-btn').hidden).toBe(false);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(ui.q('.mr-comment-btn').hidden).toBe(true);
  pointer(ui.q('.mr-main'), 'pointermove', 990, 320, 'mouse');
  ui.q('.mr-root').dispatchEvent(new Event('pointerleave'));
  expect(ui.q('.mr-comment-btn').hidden).toBe(true);
});

it('places old-side list conversations and new editors inside their list item in Focus layout', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ layout: 'focus' }));
  const prepare = vi.fn(async () => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open(
    review({
      load: async () => ({ base: '- Value 10\n- Stable\n', head: '- Value 20\n- Stable\n' }),
      prepareComment: prepare,
      loadThreads: async () => [thread(1, { side: 'base' })],
    }),
  );
  ui.flushFrame();
  expect(ui.q('.mr-thread').parentElement!.tagName).toBe('LI');
  expect(ui.q('.mr-thread').getAttribute('aria-label')).toContain('old line 1');
  const form = await ui.commentOn('.mr-tight[data-mr-change="modified"]');
  expect(form.parentElement!.tagName).toBe('LI');
  form.click();
  expect(ui.shadow().activeElement).toBe(form.querySelector('textarea'));
  form.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(form.parentElement!.classList).toContain('mr-linked');
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(form.parentElement!.tagName).toBe('LI');
});

it('keeps an existing reply draft when choosing another comment and supports cancelling from outside it', async () => {
  const t = thread(5, {
    reply: vi.fn(),
    comments: [
      { author: 'Dana', body: 'Root', createdAt: '', url: '#1' },
      { author: 'Lee', body: 'Answer', createdAt: '', url: '#2' },
    ],
  });
  await ui.open(review({ loadThreads: async () => [t] }));
  ui.click('[data-act="reply-to"][data-comment="0"]');
  ui.input('Keep this', '.mr-reply textarea');
  ui.click('[data-act="reply-to"][data-comment="1"]');
  expect(ui.q<HTMLTextAreaElement>('.mr-reply textarea').value).toBe('Keep this');
  ui.q('.mr-root').focus();
  ui.click('.mr-reply .mr-cancel');
  expect(ui.q('.mr-reply').hidden).toBe(true);
});

it.each([true, false])('ignores a new comment response after closing, success=%s', async (success) => {
  const pending = deferred<{ url: string }>();
  await ui.open(review({ prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: () => pending.promise }) }));
  await ui.commentOn();
  ui.input('Draft');
  ui.key('Enter', { ctrlKey: true });
  ui.close();
  if (success) pending.resolve({ url: '#posted' });
  else pending.reject('Write failed');
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it.each([true, false])('ignores a reply response after closing, success=%s', async (success) => {
  const pending = deferred<{ url: string }>();
  const t = thread(5, { reply: () => pending.promise });
  await ui.open(review({ loadThreads: async () => [t] }));
  ui.click('[data-act="reply-to"]');
  ui.input('Reply', '.mr-reply textarea');
  ui.key('Enter', { ctrlKey: true });
  ui.close();
  if (success) pending.resolve({ url: '#posted' });
  else pending.reject('Write failed');
  await ui.tick();
  expect(t.comments).toHaveLength(1);
});

it('ignores late comment-preparation failures after cancellation and reports non-Error failures on a live editor', async () => {
  const pending = deferred<CommentPlan>();
  const prepare = vi.fn().mockReturnValueOnce(pending.promise).mockRejectedValueOnce('No permission');
  await ui.open(review({ prepareComment: prepare }));
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  ui.click('[data-act="comment-block"]');
  ui.click('.mr-composer .mr-cancel');
  pending.reject('Late failure');
  await ui.tick();
  const form = await ui.commentOn();
  expect(form.querySelector('.mr-comment-status')!.textContent).toBe('No permission');
});

it('renders an empty request description and toggles it off again', async () => {
  await ui.open(review({ overview: { kind: 'Pull request', title: 'Guide', author: 'Dana', description: ' ', url: '#pr' } }));
  ui.click('[data-act="overview"]');
  expect(ui.q('.mr-overview-empty').textContent).toBe('No description was added to this request.');
  expect(ui.q<HTMLAnchorElement>('.mr-overview-link').getAttribute('href')).toBe('#pr');
  ui.click('[data-act="overview"]');
  expect(ui.q('.mr-overview').hidden).toBe(true);
});

it('moves point markers for hidden removed blocks to the next visible text', async () => {
  const base = '# Guide\n\nBefore.\n\nRemoved.\n\nAfter.\n\nTrailing deletion.\n';
  await ui.open(review({ load: async () => ({ base, head: '# Guide\n\nBefore.\n\nAfter.\n' }) }));
  ui.key('a');
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
    return (this.closest('[hidden], .mr-ghost') ? [] : [this.getBoundingClientRect()]) as unknown as DOMRectList;
  });
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(ui.shadow().querySelectorAll('.mr-mark.is-point')).toHaveLength(1);
  ui.scroll.mockClear();
  ui.click('.mr-mark.is-point');
  expect(ui.scroll).toHaveBeenCalledOnce();
});

it('updates contents coverage, heading focus, and change position while scrolling past wide code', async () => {
  const md = '# Guide\n\n## One\n\nValue 10.\n\n## Two\n\n```text\nWide code\n```\n\n## Three\n\nEnd.\n';
  const code = { path: 'main.txt', oldPath: 'main.txt', status: 'modified' as const, kind: 'code' as const };
  await ui.open(review({ codeDocs: [code], load: async () => ({ base: md, head: md.replace('10', '20') }) }));
  ui.key('a');
  ui.bounds(ui.q('.mr-content h2'), 100);
  ui.bounds(ui.q('[data-mr-change="modified"]'), 120);
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-toc').classList).toContain('is-covered');
  expect(ui.q('.mr-toc a').classList).toContain('is-active');
  expect(ui.q('.mr-pill-label').textContent).toBe('Change 1 of 1');
  ui.bounds(ui.q('pre'), 2000);
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-toc').classList).not.toContain('is-covered');
  ui.click('[data-act="code-files"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-file')).toBeTruthy());
  ui.bounds(ui.q('[data-document="1"]'), 320);
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-toc').classList).toContain('is-covered');
});

it('keeps an unchanged review navigable and opens no comment when every block is off screen', async () => {
  await ui.open(review({ load: async () => ({ base: '# Guide\n\nSame.\n', head: '# Guide\n\nSame.\n' }) }));
  ui.scroll.mockClear();
  ui.key('j');
  ui.key('k');
  expect(ui.scroll).not.toHaveBeenCalled();
  ui.key('a');
  ui.bounds(ui.q('.mr-content h1'), -100, 360, 30);
  ui.bounds(ui.q('.mr-content p'), 1000);
  ui.key('r');
  expect(ui.q('.mr-composer')).toBeNull();
});

it('falls back to a safe text size for a corrupt stored size and accepts validated diagram colours', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ size: 100 }));
  await ui.open(review());
  expect(ui.q('.mr-text-size').textContent).toBe('20 px');
  expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('20px');
  for (const name of ['bg', 'fg', 'muted', 'soft', 'rule', 'code-bg', 'accent']) ui.q('.mr-root').style.setProperty(`--${name}`, '#123456');
  ui.key('a');
  expect(ui.q('.mr-root').style.getPropertyValue('--accent')).toBe('#123456');
  const track = ui.q('.mr-palette-track');
  Object.defineProperty(track, 'clientWidth', { value: 0 });
  ui.key(',');
  track.dispatchEvent(new Event('scroll'));
  expect(ui.q('.mr-carousel-dot[data-page="0"]').getAttribute('aria-current')).toBe('true');
});

it('does not handle cancelled keyboard events and suppresses file shortcuts while no file is visible', async () => {
  await ui.open(review());
  const key = new KeyboardEvent('keydown', { key: 'j', bubbles: true, composed: true, cancelable: true });
  key.preventDefault();
  ui.scroll.mockClear();
  ui.q('.mr-root').dispatchEvent(key);
  expect(ui.scroll).not.toHaveBeenCalled();
  ui.close();
  await ui.open(review({ docs: [], codeDocs: [{ ...guide, path: 'main.ts', kind: 'code' }] }));
  ui.key('f');
  ui.key('v');
  expect(ui.q('.mr-files').hidden).toBe(true);
  ui.click('[data-act="overview"]');
  expect(ui.q('.mr-overview')).toBeNull();
  ui.key(',');
  ui.q('[data-settings-tab="reading"]').focus();
  ui.key('ArrowRight');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="layout"]'));
});

it('labels multiline targets and brings an editor outside the viewport into view', async () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return new DOMRect(360, this.matches('.mr-composer') ? 900 : 300, 600, 40);
  });
  await ui.open(review({ load: async () => ({ base: 'Limit 10\neuros per day.\n', head: 'Limit 20\neuros per day.\n' }) }));
  ui.scroll.mockClear();
  const form = await ui.commentOn();
  expect(form.querySelector('.mr-comment-target')!.textContent).toBe('Comment on lines 1–2');
  expect(ui.scroll).toHaveBeenCalledWith({ top: 660, behavior: 'smooth' });
});

it('keeps new-comment and reply editors while their writes are busy, even if cancellation events are dispatched', async () => {
  const post = deferred<{ url: string }>(),
    reply = deferred<{ url: string }>();
  await ui.open(
    review({
      prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: () => post.promise }),
      loadThreads: async () => [thread(5, { reply: () => reply.promise })],
    }),
  );
  const form = await ui.commentOn();
  ui.input('Comment');
  ui.key('Enter', { ctrlKey: true });
  form.querySelector('.mr-cancel')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(form.isConnected).toBe(true);
  ui.click('[data-act="reply-to"]');
  ui.input('Reply', '.mr-reply textarea');
  ui.key('Enter', { ctrlKey: true });
  ui.q('.mr-reply .mr-cancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const replyForm = ui.q('.mr-reply');
  expect(replyForm.hidden).toBe(false);
  post.resolve({ url: '#posted' });
  reply.resolve({ url: '#reply' });
  await vi.waitFor(() => expect(form.isConnected).toBe(false));
  await vi.waitFor(() => expect(replyForm.hidden).toBe(true));
});

it('quotes selected source-file lines as code and falls back to the range bounds when no rectangles are reported', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const code = { ...guide, path: 'main.txt', kind: 'code' as const };
  await ui.open(review({ docs: [], codeDocs: [code], load: async () => ({ base: '', head: 'first\nsecond\n' }) }));
  const range = document.createRange();
  range.selectNodeContents(ui.q('.mr-code-text'));
  Object.defineProperty(range, 'getClientRects', { value: () => [] });
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => ({ isCollapsed: false, rangeCount: 1, getRangeAt: () => range }) });
  ui.key('r');
  expect(ui.q('.mr-comment-quote').classList).toContain('is-code');
  expect(ui.q('.mr-comment-quote').textContent).toBe('first');
});

it('uses ordinary dates without RelativeTimeFormat and the Mac shortcut label on Mac platforms', async () => {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
  const fallbackIntl = { Segmenter: Intl.Segmenter };
  vi.stubGlobal('Intl', fallbackIntl);
  vi.resetModules();
  const { openReader: open } = await import('./reader.ts');
  const t = thread(5);
  t.comments[0].createdAt = '2026-01-02T12:00:00Z';
  const handle = open(review({ loadThreads: async () => [t], prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: vi.fn() }) }));
  try {
    await vi.waitFor(() => expect(ui.q('.mr-skeleton')).toBeNull());
    ui.flushFrame();
    await vi.waitFor(() => expect(ui.q('.mr-thread-time')?.textContent).toBe(new Date(t.comments[0].createdAt).toLocaleDateString()));
    const form = await ui.commentOn();
    expect(form.querySelector('.mr-comment-status')!.textContent).toContain('⌘↵');
  } finally {
    handle.close();
  }
});
