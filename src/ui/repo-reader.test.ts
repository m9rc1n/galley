import { expect, it, vi } from 'vitest';
import { MAX_DOCUMENT_CHARS } from '../core/limits.ts';
import { ReaderError } from '../platforms/types.ts';
import { deferred } from '../testing/reader.ts';
import { handbook, repoHarness, repository } from '../testing/repo.ts';
import { openRepository } from './repo-reader.ts';

// Diagrams and code are drawn in sandboxed frames; here drawing is instant.
const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn(), highlightCode: vi.fn(async () => {}) }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));
vi.mock('./code.ts', async (original) => ({ ...(await original<typeof import('./code.ts')>()), highlightCode: drawn.highlightCode }));

const ui = repoHarness();

it('a repository opens at its README, read at one commit, with nothing from a review', async () => {
  const source = repository();
  await ui.open(source);
  expect(ui.text('.mr-lead')).toBe('Handbook');
  expect(ui.text('.mr-file-name')).toBe('Handbook');
  expect(ui.text('.mr-repo-at')).toBe('README.md · main @ c0ffee1');
  expect(ui.q('.mr-repo-at').title).toBe(`Read at commit ${source.commit}`);
  expect(ui.q<HTMLAnchorElement>('.mr-repo-open').href).toBe('https://github.com/acme/handbook/blob/c0ffee1/README.md');
  expect(ui.q('[data-act="refresh"]').title).toBe(
    `Reading main at commit ${source.commit}. Every document comes from this commit. Choose to check for a newer one.`,
  );
  expect(ui.text('.mr-repo-commit-label')).toBe('c0ffee1');
  // Read as it is: no change marks, comments or Viewed.
  expect(ui.all('[data-mr-change], .mr-comment-btn, .mr-viewed')).toHaveLength(0);
  expect(ui.q('.mr-root').getAttribute('aria-label')).toBe('Galley: repository docs');
  expect(document.documentElement.style.overflow).toBe('hidden');
});

it('a Markdown file page opens that document at once, without listing the repository', async () => {
  const source = repository(handbook, { start: { path: 'docs/specs/reading.md', folder: false }, ref: null });
  await ui.open(source);
  expect(source.discover).not.toHaveBeenCalled();
  expect(ui.text('.mr-lead')).toBe('Reading');
  expect(ui.text('.mr-subtitle')).toBe('How documents are read');
  expect(ui.text('.mr-repo-at')).toBe('docs/specs/reading.md · default branch @ c0ffee1');
  expect(ui.text('.mr-repo-backlinks')).toContain('Galley has read 1 in this repository.');
  expect(ui.q('[data-act="refresh"]').getAttribute('aria-label')).toBe('Reading default branch at c0ffee1. Check for a newer commit');
});

it('a folder opens at its README, else its first document, else the repository’s README or first document', async () => {
  const files: Record<string, string> = {
    'README.md': '# Top',
    'docs/README.md': '# Docs',
    'docs/adr/2.md': '# Two',
    'docs/adr/1.md': '# One',
    'z/a.md': '# A',
  };
  const start = async (path: string, docs = files) => {
    ui.close();
    await ui.open(repository(docs, { start: { path, folder: true } }));
    return ui.text('.mr-doc h1');
  };
  expect(await start('docs')).toBe('Docs');
  expect(await start('docs/adr')).toBe('Two');
  expect(await start('specs')).toBe('Top');
  expect(await start('specs', { 'z/a.md': '# A', 'b/b.md': '# B' })).toBe('A');
  expect(await start('', { 'z/a.md': '# A', 'b/b.md': '# B' })).toBe('A');
});

it('says so when a repository has no documents, or could not be listed, and lists it again on request', async () => {
  await ui.open(repository({}));
  expect(ui.text('.mr-message h2')).toBe('No documents here');
  expect(ui.text('.mr-message p')).toBe('Galley found no Markdown files in acme/handbook at c0ffee1.');
  expect(ui.q<HTMLAnchorElement>('.mr-message a').href).toBe('https://github.com/acme/handbook/tree/c0ffee1');
  ui.close();
  const source = repository();
  vi.mocked(source.discover).mockRejectedValueOnce(new ReaderError('GitHub could not find this repository.', 'Add a token.'));
  await ui.open(source);
  expect(ui.text('.mr-message')).toContain('GitHub could not find this repository. Add a token.');
  ui.press('Try again');
  await ui.settled();
  await vi.waitFor(() => expect(ui.text('.mr-doc h1')).toBe('Handbook'));
});

it('explains a repository that could not be opened, with token help when a token would help', async () => {
  await ui.open(Promise.reject(new ReaderError('GitHub could not find this repository.', 'If the repository is private, add a token.', true)));
  expect(ui.text('.mr-message h2')).toBe('GitHub could not find this repository.');
  expect(ui.q<HTMLAnchorElement>('.mr-message a').href).toBe('https://github.com/settings/personal-access-tokens/new');
  ui.close();
  await ui.open(Promise.reject(new Error('offline')));
  expect(ui.text('.mr-message')).toContain('Galley could not open this repository. offline');
  ui.close();
  await ui.open(Promise.reject('down'));
  expect(ui.text('.mr-message p')).toBe('down');
  ui.press('Close');
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
});

it('a reader closed while loading stays closed, and opening another closes the first', async () => {
  const pending = deferred<ReturnType<typeof repository>>();
  const onClose = vi.fn();
  const first = openRepository(pending.promise, { onClose });
  const focus = document.createElement('button');
  document.body.append(focus);
  focus.focus();
  const second = openRepository(Promise.reject(new Error('later')));
  expect(onClose).toHaveBeenCalledOnce();
  first.close();
  expect(onClose).toHaveBeenCalledOnce();
  pending.resolve(repository());
  await pending.promise;
  second.close();
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
  // A rejection after closing shows nothing either.
  const late = deferred<ReturnType<typeof repository>>();
  openRepository(late.promise).close();
  late.reject(new Error('gone'));
  await late.promise.catch(() => {});
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
});

it('links within the repository open here at the same commit; Back and Forward return to the same paragraph', async () => {
  await ui.open(repository());
  ui.q('.mr-root').scrollTop = 0;
  ui.press('the decision', '.mr-content a');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('ADR 1: Use Markdown');
  expect(ui.q<HTMLButtonElement>('[data-act="back"]').disabled).toBe(false);
  expect(ui.q<HTMLButtonElement>('[data-act="forward"]').disabled).toBe(true);
  // Scrolled down: the second paragraph is the first one in view, 120px under the top.
  const root = ui.q('.mr-root');
  root.scrollTop = 500;
  const paragraphs = ui.all('.mr-content p');
  for (const el of ui.all('.mr-content [data-mr-u], .mr-content p, .mr-content h2')) ui.bounds(el, -200);
  ui.bounds(paragraphs[1], 120);
  ui.press('the spec', '.mr-content a');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Reading');
  expect(ui.scroll).toHaveBeenLastCalledWith({ top: expect.any(Number) });
  ui.key('ArrowLeft', { altKey: true });
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('ADR 1: Use Markdown');
  const restored = ui.all('.mr-content p')[1];
  ui.bounds(restored, 420);
  // Restoring puts that paragraph back where it was: scrolled by its distance from where it sat.
  expect(ui.scroll).toHaveBeenCalled();
  ui.click('[data-act="forward"]');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Reading');
  ui.key('ArrowRight', { altKey: true });
  ui.key('ArrowLeft', { altKey: true });
  ui.key('ArrowLeft', { altKey: true });
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Handbook');
  ui.key('ArrowLeft', { altKey: true });
  expect(ui.text('.mr-lead')).toBe('Handbook');
});

it('a section link scrolls to the section; a missing section says so; other links leave for the platform', async () => {
  const files = {
    'a.md':
      '# A\n\n## Goals\n\n[Goals](#goals), [Upper](#GOALS), [Nowhere](#nowhere), [bad](#%E0%A4%A), [B goals](b.md#goals), [Self](a.md#goals), [Top](a.md), [code](src/app.ts), [folder](docs/), [site](https://example.com), [Unlisted](c.md)',
    'b.md': '# B\n\n## Goals\n\nText',
    'docs/README.md': '# Docs',
  };
  const source = repository(files, { start: { path: 'a.md', folder: false } });
  await ui.open(source);
  const link = (label: string) => ui.all<HTMLAnchorElement>('.mr-content a').find((a) => a.textContent === label)!;
  const follow = (label: string, init: MouseEventInit = {}) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...init });
    link(label).dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(follow('Goals')).toBe(true);
  expect(ui.q('#user-content-goals').classList).toContain('mr-repo-flash');
  expect(follow('Upper')).toBe(true);
  expect(follow('Nowhere')).toBe(true);
  expect(ui.text('.mr-toast')).toBe('“nowhere” is not a section of this document; showing its beginning.');
  expect(follow('bad')).toBe(true);
  expect(follow('Self')).toBe(true);
  expect(follow('Top')).toBe(true);
  // Source files leave for the platform, and so does anything opened in a new tab.
  expect(follow('code')).toBe(false);
  expect(follow('site')).toBe(false);
  expect(follow('B goals', { ctrlKey: true })).toBe(false);
  expect(follow('B goals', { metaKey: true })).toBe(false);
  expect(follow('B goals', { shiftKey: true })).toBe(false);
  expect(follow('B goals', { button: 1 })).toBe(false);
  // Before the repository is listed, a Markdown path is tried as it is.
  expect(follow('Unlisted')).toBe(true);
  await ui.settled();
  expect(ui.text('.mr-message h2')).toBe('This document is not in the repository at this commit.');
  expect(ui.q<HTMLAnchorElement>('.mr-message a').href).toBe('https://github.com/acme/handbook/blob/c0ffee1/c.md');
  ui.press('Back', '.mr-message button');
  await ui.settled();
  expect(follow('B goals')).toBe(true);
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('B');
  expect(ui.q('#user-content-goals').classList).toContain('mr-repo-flash');
  ui.key('ArrowLeft', { altKey: true });
  await ui.settled();
  // Listed, a folder link opens the folder's README.
  ui.key('/');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline .mr-menu-item')).toHaveLength(3));
  ui.key('Escape');
  expect(follow('folder')).toBe(true);
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Docs');
});

it('the highlight on a reached section fades', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try {
    await ui.open(repository({ 'a.md': '# A\n\n## Goals\n\n[Goals](#goals)' }, { start: { path: 'a.md', folder: false } }));
    ui.press('Goals', '.mr-content a');
    expect(ui.q('#user-content-goals').classList).toContain('mr-repo-flash');
    vi.advanceTimersByTime(1600);
    expect(ui.q('#user-content-goals').classList).not.toContain('mr-repo-flash');
    expect(ui.q('.mr-toast').hidden).toBe(true);
    ui.press('Goals', '.mr-content a');
    ui.q<HTMLAnchorElement>('.mr-content p a').setAttribute('href', '#missing');
    ui.press('Goals', '.mr-content a');
    expect(ui.q('.mr-toast').hidden).toBe(false);
    vi.advanceTimersByTime(4000);
    expect(ui.q('.mr-toast').hidden).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

it('documents too large for the reader, and documents that fail to load, explain themselves', async () => {
  const files = { 'big.md': `# Big\n\n${'x'.repeat(MAX_DOCUMENT_CHARS)}`, 'ok.md': '# OK\n\n[Big](big.md)' };
  await ui.open(repository(files, { start: { path: 'ok.md', folder: false } }));
  ui.press('Big', '.mr-content a');
  await ui.settled();
  expect(ui.text('.mr-message h2')).toBe('This document is too large for the reader.');
  expect(ui.all('.mr-message button').map((b) => b.textContent)).toStrictEqual(['Back', 'Close']);
  ui.close();
  const source = repository(files, { start: { path: 'gone.md', folder: false } });
  vi.mocked(source.load).mockRejectedValueOnce(new Error('socket hang up'));
  await ui.open(source);
  expect(ui.text('.mr-message')).toContain('Galley could not read this. socket hang up');
  expect(ui.all('.mr-message button').map((b) => b.textContent)).toStrictEqual(['Close']);
});

it('a document left before it loads is never shown, and a failed load is tried again next time', async () => {
  const slow = deferred<string>();
  const failing = deferred<string>();
  const source = repository(handbook, { start: { path: 'README.md', folder: false } });
  await ui.open(source);
  vi.mocked(source.load).mockReturnValueOnce(failing.promise);
  ui.press('the decision', '.mr-content a');
  ui.key('ArrowLeft', { altKey: true });
  await ui.settled();
  failing.reject(new Error('late failure'));
  await failing.promise.catch(() => {});
  expect(ui.text('.mr-lead')).toBe('Handbook');
  vi.mocked(source.load).mockReturnValueOnce(slow.promise);
  ui.key('ArrowRight', { altKey: true });
  ui.key('ArrowLeft', { altKey: true });
  await ui.settled();
  slow.resolve('# Late');
  await slow.promise;
  expect(ui.text('.mr-lead')).toBe('Handbook');
  ui.key('ArrowRight', { altKey: true });
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Late');
});

it('a document without a title is named by its file, or by the title its front matter gives', async () => {
  const files = { 'notes/plain-notes.md': 'Just text, no heading.', 'notes/titled.md': '---\ntitle: Titled in front matter\n---\nText.' };
  await ui.open(repository(files, { start: { path: 'notes/plain-notes.md', folder: false } }));
  expect(ui.text('.mr-doc h1.mr-title')).toBe('plain notes');
  expect(ui.text('.mr-file-name')).toBe('plain notes');
  ui.close();
  await ui.open(repository(files, { start: { path: 'notes/titled.md', folder: false } }));
  expect(ui.text('.mr-doc h1.mr-title')).toBe('Titled in front matter');
});

it('a failure without advice, or that is not an error at all, still says what happened', async () => {
  const source = repository(handbook, { start: { path: 'README.md', folder: false } });
  vi.mocked(source.load).mockRejectedValueOnce(new ReaderError('Could not reach GitHub.', ''));
  await ui.open(source);
  expect(ui.all('.mr-message p')).toHaveLength(0);
  expect(ui.text('.mr-message h2')).toBe('Could not reach GitHub.');
  ui.close();
  vi.mocked(source.load).mockRejectedValueOnce('reset');
  await ui.open(source);
  expect(ui.text('.mr-message')).toContain('Galley could not read this. reset');
});

it('closing gives focus back to where it was on the page, when that can take focus', async () => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('tabindex', '0');
  document.body.append(svg);
  svg.focus();
  await ui.open(repository());
  ui.close();
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
});

it('contents list the headings of longer documents and take the reader to them', async () => {
  const doc = '# Guide\n\n## One\n\n### One a\n\n#### Deep\n\n## Two\n\ntext';
  await ui.open(repository({ 'g.md': doc, 'short.md': '# Short\n\n## Only' }, { start: { path: 'g.md', folder: false } }));
  expect(ui.all('.mr-toc a').map((a) => `${a.className}:${a.textContent}`)).toStrictEqual(['lvl-1:One', 'lvl-2:One a', 'lvl-1:Two']);
  ui.press('One a', '.mr-toc a');
  expect(ui.q('#user-content-one-a').classList).toContain('mr-repo-flash');
  ui.key('/');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline .mr-menu-item')).toHaveLength(2));
  ui.press('short.md', '.mr-menu-item');
  await ui.settled();
  expect(ui.q('.mr-toc').childElementCount).toBe(0);
});

it('external images wait for a click, one at a time or all together, unless the reader always loads them', async () => {
  const doc = '# Pics\n\n![one](https://img.example/1.png)\n\n![two](https://img.example/2.png)\n\n![local](pics/3.png)';
  await ui.open(repository({ 'p.md': doc }, { start: { path: 'p.md', folder: false } }));
  expect(ui.all<HTMLImageElement>('.mr-content img')[2].src).toBe('https://github.com/acme/handbook/raw/c0ffee1/pics/3.png');
  expect(ui.text('[data-act="load-images"]')).toBe('Load 2 external images');
  ui.click('[data-act="load-image"]');
  expect(ui.all<HTMLImageElement>('.mr-content img')[0].src).toBe('https://img.example/1.png');
  ui.click('[data-act="load-images"]');
  expect(ui.all<HTMLImageElement>('.mr-content img')[1].src).toBe('https://img.example/2.png');
  expect(ui.all('[data-act="load-images"]')).toHaveLength(0);
  ui.close();
  await ui.open(repository({ 'p.md': '# One\n\n![one](https://img.example/1.png)' }, { start: { path: 'p.md', folder: false } }));
  expect(ui.text('[data-act="load-images"]')).toBe('Load 1 external image');
  ui.click('[data-act="settings"]');
  ui.click('[data-setting="images"] [data-value="load"]');
  expect(ui.q<HTMLImageElement>('.mr-content img').src).toBe('https://img.example/1.png');
  expect(JSON.parse(localStorage.getItem('galley:settings')!).images).toBe('load');
});

it('reading settings: appearance, text size and the review palette, kept with the review settings', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'nord', font: 'sans', size: 4, appearance: 'dark', topGlow: false, density: 'compact' }));
  const diagram = '# D\n\n```mermaid\nflowchart LR\n  A --> B\n```';
  await ui.open(repository({ 'd.md': diagram }, { start: { path: 'd.md', folder: false } }));
  const root = ui.q('.mr-root');
  await vi.waitFor(() => expect(root.dataset.theme).toBe('nord'));
  expect(root.dataset.font).toBe('sans');
  expect(root.dataset.density).toBe('compact');
  expect(root.classList).toContain('is-dark');
  expect(root.classList).toContain('no-top-glow');
  expect(ui.text('.mr-text-size')).toBe('24 px');
  expect(ui.q<HTMLButtonElement>('[data-act="larger"]').disabled).toBe(true);
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-repo-settings').hidden).toBe(false);
  ui.click('[data-act="smaller"]');
  expect(ui.text('.mr-text-size')).toBe('22 px');
  ui.click('[data-act="larger"]');
  expect(ui.text('.mr-text-size')).toBe('24 px');
  ui.click('[data-act="smaller"]');
  ui.click('[data-setting="appearance"] [data-value="auto"]');
  expect(root.classList).not.toContain('is-dark');
  Object.defineProperty(ui.media, 'matches', { value: true, configurable: true });
  ui.media.dispatchEvent(new Event('change'));
  expect(root.classList).toContain('is-dark');
  // Diagrams are drawn in the reading palette and redrawn when it changes.
  expect(drawn.renderDiagrams).toHaveBeenLastCalledWith(expect.any(Array), true, expect.any(Function), undefined);
  drawn.renderDiagrams.mock.lastCall![2]();
  const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: () => '#123456' } as unknown as CSSStyleDeclaration);
  ui.click('[data-setting="appearance"] [data-value="light"]');
  expect(drawn.renderDiagrams.mock.lastCall![3]).toMatchObject({ bg: '#123456' });
  style.mockRestore();
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-repo-settings').hidden).toBe(true);
  for (let i = 0; i < 5; i++) ui.click('[data-act="smaller"]');
  expect(ui.text('.mr-text-size')).toBe('17 px');
  expect(ui.q<HTMLButtonElement>('[data-act="smaller"]').disabled).toBe(true);
  // A diagram can be seen at full size.
  const zoom = document.createElement('button');
  zoom.dataset.act = 'zoom-diagram';
  zoom.append(Object.assign(document.createElement('img'), { src: 'data:image/svg+xml,<svg/>' }));
  ui.q('.mr-diagram-view').replaceChildren(zoom);
  zoom.click();
  expect(ui.q('.mr-repo-zoom').hidden).toBe(false);
  expect(ui.q<HTMLImageElement>('.mr-repo-zoom img').src).toBe('data:image/svg+xml,<svg/>');
  ui.key('Escape');
  expect(ui.q('.mr-repo-zoom').hidden).toBe(true);
  zoom.click();
  ui.click('[data-act="close-zoom"]');
  expect(ui.q('.mr-repo-zoom').hidden).toBe(true);
});

it('an out-of-range saved text size falls back to the default', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ size: 99 }));
  await ui.open(repository());
  await vi.waitFor(() => expect(ui.text('.mr-text-size')).toBe('20 px'));
});

it('keys: Esc closes menus then the reader, / finds a document, M switches to the map; page shortcuts never fire', async () => {
  const onClose = vi.fn();
  await ui.open(repository(), { onClose });
  const page = vi.fn();
  window.addEventListener('keydown', page);
  ui.key('/');
  expect(ui.q('.mr-repo-docs').hidden).toBe(false);
  ui.key('m');
  expect(ui.q('.mr-repo-map').hidden).toBe(true);
  ui.key('ArrowLeft', { altKey: true });
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-repo-search'));
  ui.key('Escape');
  expect(ui.q('.mr-repo-docs').hidden).toBe(true);
  ui.key('M');
  await vi.waitFor(() => expect(ui.q('.mr-repo-map').hidden).toBe(false));
  ui.key('m');
  expect(ui.q('.mr-repo-read').hidden).toBe(false);
  ui.key('m', { ctrlKey: true });
  ui.key('x');
  expect(ui.q('.mr-repo-read').hidden).toBe(false);
  // Keys from the page itself are not the reader's.
  const outside = document.createElement('input');
  document.body.append(outside);
  outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(onClose).not.toHaveBeenCalled();
  document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
  ui.key('Escape');
  expect(onClose).toHaveBeenCalledOnce();
  expect(page).not.toHaveBeenCalledWith(expect.objectContaining({ key: '/' }));
  window.removeEventListener('keydown', page);
});

it('scrolling moves the progress bar and quiets the top bar', async () => {
  await ui.open(repository());
  const root = ui.q('.mr-root');
  Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 2000 });
  Object.defineProperty(root, 'clientHeight', { configurable: true, value: 1000 });
  root.scrollTop = 500;
  root.dispatchEvent(new Event('scroll'));
  expect(ui.q('.mr-progress > div').style.transform).toBe('scaleX(0.5)');
  expect(ui.q('.mr-topbar').classList).toContain('is-scrolled');
  Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 1000 });
  root.scrollTop = 0;
  root.dispatchEvent(new Event('scroll'));
  expect(ui.q('.mr-progress > div').style.transform).toBe('scaleX(0)');
  expect(ui.q('.mr-topbar').classList).not.toContain('is-scrolled');
});
