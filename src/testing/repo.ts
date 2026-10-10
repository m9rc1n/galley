import { afterEach, beforeEach, expect, vi } from 'vitest';
import { ReaderError, type RepositorySource } from '../platforms/types.ts';
import { openRepository, type RepoReaderHandle } from '../ui/repo-reader.ts';

/** A small handbook: a README, a decision that links to a spec, and the spec. */
export const handbook: Record<string, string> = {
  'README.md': '# Handbook\n\nStart with [the decision](docs/adr/0001-use-markdown.md).',
  'docs/adr/0001-use-markdown.md':
    '# ADR 1: Use Markdown\n\n## Status\n\nAccepted\n\n## Context\n\nSee [the spec](../specs/reading.md#goals) and [the README](../../README.md).',
  'docs/specs/reading.md':
    '---\ntype: spec\ndescription: How documents are read\n---\n\n# Reading\n\n## Goals\n\nRead [the decision](../adr/0001-use-markdown.md).',
};

/** A repository read at one commit, from files in memory. Missing files fail the way the platforms say. */
export function repository(files: Record<string, string> = handbook, patch: Partial<RepositorySource> = {}): RepositorySource {
  const source: RepositorySource = {
    platform: 'GitHub',
    name: 'acme/handbook',
    ref: 'main',
    commit: 'c0ffee1234567890abcdef1234567890abcdef12',
    start: { path: '', folder: true },
    url: 'https://github.com/acme/handbook/tree/c0ffee1',
    discover: vi.fn(async () => ({ docs: Object.keys(files).map((path) => ({ path })), limits: [] })),
    load: vi.fn(async (path: string) => {
      if (!(path in files))
        throw new ReaderError('This document is not in the repository at this commit.', 'The link may point to a file that was moved or removed.');
      return files[path];
    }),
    links: { raw: (path) => `https://github.com/acme/handbook/raw/c0ffee1/${path}`, blob: (path) => `https://github.com/acme/handbook/blob/c0ffee1/${path}` },
    refresh: vi.fn(async () => source),
    ...patch,
  };
  return source;
}

/** Text of every text node, joined with spaces: jsdom has no innerText. */
export function words(el: Node): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) parts.push(node.textContent!);
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,:;])/g, '$1')
    .trim();
}

/** jsdom has no layout: supply geometry, then drive the real repository reader with DOM events. */
export function repoHarness() {
  let handle: RepoReaderHandle | undefined;
  const media = new EventTarget() as MediaQueryList;
  const scroll = vi.fn();
  const bounds = new WeakMap<Element, DOMRect>();

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(media, 'matches', { value: false, configurable: true });
    vi.stubGlobal('matchMedia', () => media);
    scroll.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scroll });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return bounds.get(this) ?? new DOMRect(0, 300, 600, 40);
    });
  });

  afterEach(() => {
    handle?.close();
    document.body.replaceChildren();
    document.documentElement.style.overflow = '';
    localStorage.clear();
  });

  const shadow = () => document.querySelector('#galley-repo-reader')!.shadowRoot!;
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => shadow().querySelector<T>(selector)!;
  const all = <T extends HTMLElement = HTMLElement>(selector: string) => [...shadow().querySelectorAll<T>(selector)];
  /** The words of an element as a reader sees them: separate elements stay separate words. */
  const text = (selector: string) => words(q(selector));
  const click = (selector: string) => {
    const el = q(selector);
    expect(el, selector).toBeTruthy();
    el.click();
  };
  /** Clicks the button or link whose text includes `label`. */
  const press = (label: string, selector = 'button, a') => {
    const el = all(selector).find((candidate) => candidate.textContent!.includes(label));
    expect(el, label).toBeTruthy();
    el!.click();
  };
  const key = (key: string, options: KeyboardEventInit = {}) =>
    (shadow().activeElement ?? q('.mr-root')).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...options }));
  /** Waits until the document is shown: no loading skeleton left in the reading column. */
  const settled = () => vi.waitFor(() => expect(shadow().querySelector('.mr-doc .mr-skeleton')).toBeNull());
  async function open(source: RepositorySource | Promise<RepositorySource>, options?: Parameters<typeof openRepository>[1]) {
    handle = openRepository(source, options);
    await settled();
    return handle;
  }
  return {
    open,
    settled,
    shadow,
    q,
    all,
    text,
    click,
    press,
    key,
    media,
    scroll,
    bounds: (el: Element, top: number, height = 40) => bounds.set(el, new DOMRect(0, top, 600, height)),
    close: () => handle?.close(),
  };
}
