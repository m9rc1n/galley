import { afterEach, beforeEach, expect, vi } from 'vitest';
import { openReader, type ReaderHandle } from '../ui/reader.ts';
import type { DocContents, DocRef, ReviewSource } from '../platforms/types.ts';

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

/** jsdom has no layout engine. Supply geometry only; use the real reader and DOM events. */
export function readerHarness() {
  let handle: ReaderHandle | undefined;
  const frames = new Map<number, FrameRequestCallback>();
  const bounds = new WeakMap<Element, DOMRect>();
  let nextFrame = 0;
  const media = new EventTarget() as MediaQueryList;
  Object.defineProperty(media, 'matches', { value: false, writable: true });
  const disconnect = vi.fn();
  const scroll = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    frames.clear();
    Object.defineProperty(media, 'matches', { value: false });
    vi.stubGlobal('matchMedia', (query: string) => query.includes('color-scheme') ? media : { matches: false });
    vi.stubGlobal('CSS', { highlights: new Map() });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect = disconnect; });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return bounds.get(this) ?? new DOMRect(360, 300, 600, 40);
    });
    vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
      return (this.closest('[hidden]') ? [] : [this.getBoundingClientRect()]) as unknown as DOMRectList;
    });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect(400, 300, 100, 20) });
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [new DOMRect(400, 300, 100, 20)] });
    scroll.mockClear(); disconnect.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scroll });
  });

  afterEach(() => {
    handle?.close();
    document.body.replaceChildren();
    document.documentElement.style.overflow = '';
    localStorage.clear();
  });

  function shadow(): ShadowRoot { return document.querySelector('#galley-reader')!.shadowRoot!; }
  function q<T extends HTMLElement = HTMLElement>(selector: string): T { return shadow().querySelector<T>(selector)!; }
  function click(selector: string) { const el = q(selector); expect(el, selector).toBeTruthy(); el.click(); }
  function key(key: string, options: KeyboardEventInit = {}) {
    (shadow().activeElement ?? q('.mr-root')).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...options }));
  }
  function flushFrame() {
    const pending = [...frames.values()]; frames.clear();
    for (const callback of pending) callback(performance.now());
  }
  async function open(source: ReviewSource | Promise<ReviewSource>, options?: Parameters<typeof openReader>[1]) {
    handle = openReader(source, options);
    await vi.waitFor(() => expect([...shadow().querySelectorAll('.mr-skeleton')].filter((el) => !el.closest('[hidden]'))).toHaveLength(0));
    flushFrame();
    return handle;
  }
  async function readyViewed() { await vi.waitFor(() => expect(q<HTMLButtonElement>('.mr-viewed').disabled).toBe(false)); }
  /** Types into an editor: the newest new-comment editor unless a selector names another. */
  function input(text: string, selector?: string) {
    const field = selector ? q<HTMLTextAreaElement>(selector) : [...shadow().querySelectorAll<HTMLTextAreaElement>('.mr-composer textarea')].at(-1)!;
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  /** Points at a block, chooses the comment control beside it, and waits until its editor is ready. */
  async function commentOn(selector = '.mr-content [data-mr-change="modified"]') {
    q(selector).dispatchEvent(new Event('pointerover', { bubbles: true }));
    click('[data-act="comment-block"]');
    const composer = () => shadow().activeElement?.closest<HTMLFormElement>('.mr-composer');
    await vi.waitFor(() => expect(composer()?.querySelector('.mr-comment-status')?.textContent).not.toBe('Preparing…'));
    flushFrame();
    return composer()!;
  }
  /** Lets a deferred step run, such as removing an editor that was left empty. */
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { open, q, shadow, click, key, flushFrame, readyViewed, input, commentOn, tick, media, scroll, disconnect,
    bounds: (el: Element, top: number, left = 360, height = 40) => bounds.set(el, new DOMRect(left, top, 600, height)),
    close: () => handle?.close(),
  };
}

export const guide: DocRef = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' };
export const contents: DocContents = { base: '# Guide\n\nUnchanged context.\n\nThe limit is 10 euros.\n', head: '# Guide\n\nUnchanged context.\n\nThe limit is 20 euros.\n' };
export function review(patch: Partial<ReviewSource> = {}): ReviewSource {
  return { title: 'Update the guide', subtitle: 'team/project · !7', diffUrl: 'https://gitlab.com/team/project/-/merge_requests/7/diffs', docs: [guide],
    load: vi.fn(async () => contents), links: () => ({ blob: (p) => `https://gitlab.com/blob/${p}`, raw: (p) => `https://gitlab.com/raw/${p}` }), ...patch };
}
