import { expect, it, vi } from 'vitest';
import { contents, guide, readerHarness, review } from '../testing/reader.ts';
import type { DocRef } from '../platforms/types.ts';

const h = readerHarness();
const code = (path: string): DocRef => ({ path, oldPath: path, status: 'modified', kind: 'code' });
const source = code('src/limits/quota.ts');
const test = code('tests/quota.test.ts');
const lock = code('package-lock.json');
const gone = { ...code('old/legacy.ts'), status: 'removed' as const };
const renamed = { ...code('src/auth/access.ts'), oldPath: 'src/auth/login.ts', status: 'renamed' as const };
const image: DocRef = { path: 'assets/image.png', oldPath: 'assets/image.png', status: 'added' };
const docs = [guide, { ...guide, path: 'docs/rfcs/plan.md' }];
const load = async (doc: DocRef) => (doc.kind === 'code' ? { base: 'export const quota = 1;\n', head: 'export const quota = 2;\n' } : contents);
const set = (patch = {}) => review({ docs, codeDocs: [source, test, lock, gone, renamed], otherFiles: [image], load: vi.fn(load), ...patch });
const buttons = (text: string, scope: ParentNode = h.q('.mr-chapters')) =>
  [...scope.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent === text);
const click = (text: string, scope?: ParentNode) => {
  const button = buttons(text, scope)[0];
  expect(button, text).toBeTruthy();
  button.click();
};
const rows = () => [...h.shadow().querySelectorAll<HTMLElement>('.mr-chapters [data-file]')];
const row = (path: string) => rows().find((row) => row.querySelector('.mr-chapter-path')?.textContent === path)!;
const chapter = (id: string) => [...h.shadow().querySelectorAll<HTMLDetailsElement>('[data-chapter]')].find((el) => el.dataset.chapter === id)!;

it('offers an optional map, accounts for disabled, folded, renamed, deleted and platform-only files, and enables selected code', async () => {
  const src = set();
  await h.open(src);
  h.key('m');
  expect(h.q('.mr-chapters').hidden).toBe(false);
  expect(rows()).toHaveLength(8);
  expect(row(source.path).textContent).toContain('Code files off');
  expect(row(test.path).textContent).toContain(`Test for ${source.path}`);
  expect(row(renamed.path).textContent).toContain(`Renamed from ${renamed.oldPath}`);
  expect(row(gone.path).textContent).toContain('Deleted');
  const link = row(image.path).querySelector<HTMLAnchorElement>('a')!;
  expect(link.href).toBe(src.diffUrl);
  expect(link.rel).toBe('noopener noreferrer');
  expect(src.load).not.toHaveBeenCalledWith(image);
  link.click();
  expect(h.q('.mr-chapters').hidden).toBe(true);
  h.key('m');
  row(source.path).querySelector<HTMLButtonElement>('button')!.click();
  await vi.waitFor(() => expect(h.q('[aria-label="src/limits/quota.ts"] .mr-content')).toBeTruthy());
  expect(h.q('[aria-label="src/limits/quota.ts"]').hidden).toBe(false);
  expect(h.q('.mr-chapters').hidden).toBe(true);
  h.key('m');
  await vi.waitFor(() => expect(row(lock.path).textContent).toContain('Folded'));
  expect(h.q('.mr-chapters-progress').textContent).toContain('0 explicitly viewed');
  click('All files');
  expect(h.shadow().querySelectorAll('.mr-chapters details')).toHaveLength(0);
  expect(rows()).toHaveLength(8);
  click('Chapter map');
  expect(chapter('code:src/limits').textContent).toContain('nearest folder');
  h.key('Escape');
  expect(h.q('.mr-chapters').hidden).toBe(true);
});

it('counts only explicit Viewed actions and follows the next readable chapter without changing folds', async () => {
  await h.open(set());
  await h.readyViewed();
  h.q('.mr-root').dispatchEvent(new Event('scroll'));
  h.flushFrame();
  h.click('.mr-chapters-toggle');
  expect(h.q('.mr-chapters-progress').textContent).toContain('0 explicitly viewed');
  click('Start here');
  await h.readyViewed();
  h.key('v');
  await vi.waitFor(() => expect(h.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  h.key('m');
  expect(h.q('.mr-chapters-progress').textContent).toContain('1 explicitly viewed');
  expect(buttons('Continue here')[0].disabled).toBe(false);
  click('Continue here');
  h.flushFrame();
  h.key('m');
  expect(row(docs[1].path).getAttribute('aria-current')).toBe('true');
  h.key('Escape');
  h.click('.mr-chapter-next');
  h.key('m');
  expect(row(source.path).getAttribute('aria-current')).toBe('true');
  h.key('Escape');
  // Explicitly folding and reopening the map keeps the original document nodes.
  const section = h.q('[aria-label="src/limits/quota.ts"]');
  await vi.waitFor(() => expect(section.querySelector('[data-act="fold-file"]')).toBeTruthy());
  section.querySelector<HTMLButtonElement>('[data-act="fold-file"]')!.click();
  h.key('m');
  expect(row(source.path).textContent).toContain('Folded');
  click('Read chapter', chapter('code:src/limits'));
  expect(section.classList.contains('is-folded')).toBe(true);
});

it('preserves failed files in the map and updates their status after retry', async () => {
  let failed = true;
  await h.open(
    set({
      load: vi.fn(async (doc: DocRef) => {
        if (doc === guide && failed) throw new Error('Temporary error');
        return load(doc);
      }),
    }),
  );
  h.key('m');
  expect(row(guide.path).textContent).toContain('Failed to load');
  row(guide.path).querySelector<HTMLButtonElement>('button')!.click();
  failed = false;
  h.click('[data-act="retry-doc"]');
  await vi.waitFor(() => expect(h.q('[aria-label="docs/guide.md"] .mr-content')).toBeTruthy());
  h.key('m');
  expect(row(guide.path).textContent).not.toContain('Failed to load');
});

it('edits names and introductions, moves chapters and files, and retains the active section and draft', async () => {
  await h.open(set());
  const section = h.q('[aria-label="docs/guide.md"]');
  await h.commentOn();
  h.input('Keep this question for later');
  const editor = h.q<HTMLTextAreaElement>('.mr-composer textarea');
  h.q('.mr-root').focus();
  h.click('.mr-chapters-toggle');
  click('Edit chapters');
  const detail = chapter('docs:docs');
  const name = detail.querySelector<HTMLInputElement>('input')!;
  name.value = 'Context and intention';
  name.dispatchEvent(new Event('input'));
  expect(detail.querySelector('.mr-chapter-title')!.textContent).toBe(name.value);
  expect(h.q<HTMLSelectElement>('[data-chapter-destination]').selectedOptions[0].textContent).toBe(name.value);
  h.input('Read the intent before the implementation.', '[data-chapter="docs:docs"] textarea');
  click('Later', detail);
  expect(h.q('[aria-label="docs/guide.md"]')).toBe(section);
  expect(h.q<HTMLTextAreaElement>('.mr-composer textarea')).toBe(editor);
  expect(editor.value).toBe('Keep this question for later');
  expect(row(guide.path).getAttribute('aria-current')).toBe('true');
  click('Earlier', chapter('docs:docs'));
  click('New chapter');
  expect(chapter('custom:1').textContent).toContain('No files yet');
  const customName = chapter('custom:1').querySelector<HTMLInputElement>('input')!;
  customName.value = '';
  customName.dispatchEvent(new Event('input'));
  expect(chapter('custom:1').textContent).toContain('Untitled chapter');
  const form = h.q<HTMLFormElement>('.mr-chapter-assignment');
  form.querySelectorAll('select')[0].value = '0';
  form.querySelectorAll('select')[1].value = 'custom:1';
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(chapter('custom:1').textContent).toContain(guide.path);
  expect(chapter('docs:docs').textContent).not.toContain(guide.path);
  expect(rows()).toHaveLength(8);
  click('Done editing');
  expect(chapter('docs:docs').textContent).toContain('Read the intent before the implementation.');
  click('Edit chapters');
  click('Reset chapters');
  expect(chapter('docs:docs').querySelector<HTMLInputElement>('input')!.value).toBe('docs');
  expect(h.shadow().querySelector('[data-chapter="custom:1"]')).toBeNull();
  expect(h.q<HTMLTextAreaElement>('.mr-composer textarea').value).toBe('Keep this question for later');
  h.key('Escape');
  // An explicit file-order setting replaces the custom chapter ordering.
  h.click('[data-act="settings"]');
  h.click('[data-settings-tab="review"]');
  h.click('[data-setting="order"] [data-value="listed"]');
  expect([...h.shadow().querySelectorAll<HTMLElement>('.mr-document')].map((el) => el.getAttribute('aria-label'))).toEqual(
    [...docs, source, test, lock, gone, renamed].map((doc) => doc.path),
  );
});

it('traps dialog focus, shields reader shortcuts, restores focus and keeps simple reviews simple', async () => {
  await h.open(set());
  const toggle = h.q<HTMLButtonElement>('.mr-chapters-toggle');
  toggle.focus();
  toggle.click();
  const close = buttons('Close')[0];
  expect(h.shadow().activeElement).toBe(close);
  expect(h.q('.mr-topbar').inert).toBe(true);
  h.key('Tab', { shiftKey: true });
  expect(h.shadow().activeElement).toBe(buttons('Reset chapters')[0]);
  h.key('Tab');
  expect(h.shadow().activeElement).toBe(close);
  h.key('Tab');
  h.key('j');
  expect(row(guide.path).getAttribute('aria-current')).toBe('true');
  h.key('Escape');
  expect(h.shadow().activeElement).toBe(toggle);
  expect(h.q('.mr-topbar').inert).toBe(false);
  h.key('m');
  h.click('.mr-chapters-backdrop');
  h.click('.mr-chapter-route button');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  click('Close');
  h.q('.mr-root').focus();
  h.q('.mr-root').blur();
  toggle.click();
  click('Close');
  expect(h.shadow().activeElement).toBe(toggle);
  h.key('m');
  const detail = chapter('docs:docs');
  detail.open = false;
  detail.dispatchEvent(new Event('toggle'));
  h.close();
  await h.open(review());
  expect(h.q('.mr-chapters-toggle').hidden).toBe(true);
  expect(h.q('.mr-chapter-route').hidden).toBe(true);
  h.key('m');
  expect(h.q('.mr-chapters').hidden).toBe(true);
});

it('can revisit a fully viewed chapter, skips empty and platform-only chapters, and never invents progress', async () => {
  await h.open(set({ codeDocs: [source, test, lock] }));
  await h.readyViewed();
  h.key('v');
  await vi.waitFor(() => expect(h.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  h.key('m');
  click('Read chapter', chapter('docs:docs'));
  h.key('m');
  click('Edit chapters');
  click('Earlier', chapter('other'));
  click('Earlier', chapter('other'));
  click('Earlier', chapter('other'));
  click('New chapter');
  click('Earlier', chapter('custom:1'));
  click('Earlier', chapter('custom:1'));
  click('Earlier', chapter('custom:1'));
  click('Earlier', chapter('custom:1'));
  h.key('Escape');
  expect(h.q('.mr-chapter-route').hidden).toBe(false);
  h.click('.mr-chapter-next');
  h.key('m');
  expect(row(docs[1].path).getAttribute('aria-current')).toBe('true');
  expect(h.q('.mr-chapters-progress').textContent).toContain('1 explicitly viewed');
});

it('keeps an unsupported-only review accessible and sanitizes its platform link', async () => {
  await h.open(review({ docs: [], otherFiles: [image, { ...image, path: 'assets/second.png' }], diffUrl: 'javascript:alert(1)' }));
  h.q('.mr-chapters-toggle').click();
  expect(rows()).toHaveLength(2);
  expect(row(image.path).querySelector('a')!.hasAttribute('href')).toBe(false);
  expect(buttons('Start here')[0].disabled).toBe(true);
  click('Edit chapters');
  click('Reset chapters');
  h.key('Escape');
});
