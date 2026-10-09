import { expect, it, vi } from 'vitest';
import { ReaderError, type DocContents, type DocRef, type Thread } from '../platforms/types.ts';
import { contents, deferred, guide, readerHarness, review } from '../testing/reader.ts';
import { openReader } from './reader.ts';

const ui = readerHarness();
const second: DocRef = { ...guide, path: 'docs/second.md', oldPath: 'docs/second.md' };
const code: DocRef = { ...guide, path: 'src/main.py', oldPath: 'src/main.py', kind: 'code' };
const thread = (patch: Partial<Thread> = {}): Thread => ({
  doc: guide,
  side: 'head',
  line: 5,
  url: '#thread',
  comments: [{ author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' }],
  ...patch,
});
const sections = (word: string) =>
  `# Title\n\n## Alpha\n\nFirst ${word} words.\n\nSecond ${word} words.\n\n## Beta\n\nThird ${word} words.\n\n## Gamma\n\nFourth ${word} words.\n`;
const post = vi.fn(async (_body: string) => ({ url: '#posted' }));
const prepareComment = async () => ({ kind: 'inline' as const, label: 'Inline', post });

it('turns to the next page of palettes and shuts the settings sheet from its own button', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'paper' }));
  await ui.open(review());
  await ui.tick();
  ui.click('[data-act="settings"]');
  ui.scroll.mockClear();
  ui.click('[data-act="palette-next"]');
  expect(ui.scroll).toHaveBeenCalledOnce();
  expect(vi.mocked(ui.scroll).mock.lastCall![0]).toMatchObject({ left: expect.any(Number) });
  expect((vi.mocked(ui.scroll).mock.lastCall![0] as ScrollToOptions).left).toBeGreaterThan(0);
  expect(ui.q('.mr-settings').hidden).toBe(false);
  ui.click('[data-act="close-settings"]');
  expect(ui.q('.mr-settings').hidden).toBe(true);
});

it('shows a failure that has no hint as a title with only the way back', async () => {
  await ui.open(Promise.reject(new ReaderError('This review is empty')));
  expect(ui.q('.mr-message h2').textContent).toBe('This review is empty');
  expect(ui.q('.mr-message p')).toBeNull();
  expect(ui.shadow().querySelectorAll('.mr-message [data-act]')).toHaveLength(1);
});

it('does not open the documents menu when no document is shown', async () => {
  await ui.open(review({ docs: [], codeDocs: [code] }));
  ui.click('[data-act="files"]');
  expect(ui.q('.mr-files').hidden).toBe(true);
});

it('starts on the first shown document when asked to start on a source file that is hidden', async () => {
  await ui.open(review({ codeDocs: [code] }), { start: 1 });
  await ui.tick();
  expect(ui.q('.mr-file-btn').dataset.path).toBe(guide.path);
});

it('starts on a document that failed to load, without contents for it, and ignores a context change meanwhile', async () => {
  const load = vi.fn(async (doc: DocRef): Promise<DocContents> => {
    if (doc === second) throw new Error('Offline');
    return contents;
  });
  await ui.open(review({ docs: [guide, second], load }), { start: 1 });
  expect(ui.q('.mr-file-btn').dataset.path).toBe(second.path);
  expect(ui.q('.mr-toc').children).toHaveLength(0);
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(ui.q('.mr-toc').children).toHaveLength(0);
});

it('clears the contents when scrolling reaches a document that has not finished loading', async () => {
  const pending = deferred<DocContents>();
  const sectioned = { base: sections('old'), head: sections('new') };
  const handle = openReader(review({ docs: [guide, second], load: async (doc) => (doc === second ? pending.promise : sectioned) }));
  await vi.waitFor(() => expect(ui.q('.mr-toc').children.length).toBeGreaterThan(0));
  ui.bounds(ui.shadow().querySelectorAll<HTMLElement>('.mr-document')[1], 100);
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-file-btn').dataset.path).toBe(second.path);
  expect(ui.q('.mr-toc').children).toHaveLength(0);
  handle.close();
  pending.resolve(contents);
});

it('marks a section in the contents once, however many changes it holds', async () => {
  await ui.open(review({ load: async () => ({ base: sections('old'), head: sections('new') }) }));
  expect(ui.shadow().querySelectorAll('[data-mr-change="modified"]')).toHaveLength(4);
  expect(ui.shadow().querySelectorAll('.mr-toc .mr-dot')).toHaveLength(3);
});

it('keeps the comment control and the selection chip for text outside the editors', async () => {
  await ui.open(review({ prepareComment }));
  const composer = await ui.commentOn();
  // Shift released inside an editor never counts as selecting text of the document.
  composer.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true, composed: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('ignores a click in the text that leaves nothing selected', async () => {
  await ui.open(review());
  ui.q('.mr-content p').dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('offers the chip for a selection made of text nodes in the document, and not for one made in an editor', async () => {
  await ui.open(review({ prepareComment, loadThreads: async () => [thread()] }));
  ui.flushFrame();
  let range = document.createRange();
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => ({ isCollapsed: false, rangeCount: 1, getRangeAt: () => range }) });
  const selectIn = (text: Text) => {
    range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, text.length);
    ui.q('.mr-root').dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true, composed: true }));
  };
  const textOf = (selector: string) => [...ui.q(selector).childNodes].flatMap((node) => (node.nodeType === 3 ? [node as Text] : []))[0];
  selectIn(textOf('.mr-content p'));
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  selectIn(textOf('.mr-thread-body p'));
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('treats the card the reader focuses as the one the comments column is arranged around, once', async () => {
  await ui.open(review({ loadThreads: async () => [thread()] }));
  ui.flushFrame();
  const card = ui.q('.mr-thread');
  const button = card.querySelector('button') ?? card;
  const focus = () => button.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  focus();
  ui.flushFrame();
  focus();
  expect(card.isConnected).toBe(true);
});

it('closes the reader on Escape when nothing inside it has focus', async () => {
  await ui.open(review());
  (ui.shadow().activeElement as HTMLElement | null)?.blur();
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('skips a document that has not loaded when choosing the paragraph to comment on', async () => {
  const pending = deferred<DocContents>();
  const handle = openReader(review({ docs: [guide, second], prepareComment, load: async (doc) => (doc === second ? pending.promise : contents) }));
  await vi.waitFor(() => expect(ui.shadow().querySelector('.mr-document [data-mr-change]')).not.toBeNull());
  ui.key('r');
  await vi.waitFor(() => expect(ui.q('.mr-composer')).not.toBeNull());
  handle.close();
  pending.resolve(contents);
});

it('draws the change bar for a removed block where the next visible block is, even when hidden blocks lie in between', async () => {
  const none = (el: Element) => el.matches('.mr-ghost') || Boolean(el.closest('[hidden]'));
  vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
    return (none(this) ? [] : [this.getBoundingClientRect()]) as unknown as DOMRectList;
  });
  await ui.open(review({ load: async () => ({ base: 'Intro.\n\nRemoved one.\n\nRemoved two.\n\nOutro.\n', head: 'Intro.\n\nOutro.\n' }) }));
  ui.flushFrame();
  expect(ui.shadow().querySelectorAll('.mr-mark.is-point').length).toBeGreaterThan(0);
  ui.click('.mr-mark.is-point');
  expect(ui.scroll).toHaveBeenCalled();
});

it('redraws when the window is resized, when a picture arrives and when held pictures are allowed', async () => {
  let resized!: () => void;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const image = '![pixel](https://tracker.example/a.png)';
  await ui.open(review({ load: async () => ({ base: '', head: `# Guide\n\n![local](pic.png)\n\n${image}\n` }) }));
  const frame = vi.spyOn(globalThis, 'requestAnimationFrame');
  ui.flushFrame();
  resized();
  expect(frame).toHaveBeenCalledTimes(1);
  ui.flushFrame();
  ui.q('.mr-content img:not([data-mr-src])').dispatchEvent(new Event('load'));
  expect(frame).toHaveBeenCalledTimes(2);
  ui.flushFrame();
  ui.click('[data-act="load-images"]');
  ui.flushFrame();
  ui.q('.mr-content img[src="https://tracker.example/a.png"]').dispatchEvent(new Event('load'));
  expect(frame.mock.calls.length).toBeGreaterThan(2);
});

it('hides a notice after a few seconds', async () => {
  await ui.open(review());
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try {
    ui.key('n');
    expect(ui.q('.mr-toast').hidden).toBe(false);
    vi.advanceTimersByTime(6000);
    expect(ui.q('.mr-toast').hidden).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it('leaves a removed word out of the heading it was in when listing the contents', async () => {
  const base = '# Title\n\n## Alpha first\n\nOne.\n\n## Beta\n\nTwo.\n\n## Gamma\n\nThree.\n';
  const head = '# Title\n\n## Alpha second\n\nOne changed.\n\n## Beta\n\nTwo changed.\n\n## Gamma\n\nThree changed.\n';
  await ui.open(review({ load: async () => ({ base, head }) }));
  expect(ui.q('.mr-content h2 del')).not.toBeNull();
  expect(ui.q('.mr-toc [data-i="0"]').textContent).toBe('Alpha second');
});

it('lets an untouched editor make way when a comment is started somewhere else', async () => {
  await ui.open(review({ prepareComment, load: async () => ({ base: sections('old'), head: sections('new') }) }));
  await ui.commentOn('.mr-content p:nth-of-type(1)');
  expect(ui.shadow().querySelectorAll('.mr-composer')).toHaveLength(1);
  await ui.commentOn('.mr-content p:nth-of-type(2)');
  expect(ui.shadow().querySelectorAll('.mr-composer')).toHaveLength(1);
});
