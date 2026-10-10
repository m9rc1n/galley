import { describe, expect, it, vi } from 'vitest';
import { deferred, readerHarness, review } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';
import { openReader } from './reader.ts';
import { serveSpecs } from './spec-frame.ts';
import * as viewed from './viewed.ts';
import * as positions from './positions.ts';
import type { DocContents, DocRef, Thread } from '../platforms/types.ts';

const ui = readerHarness();
const code = (path: string, status: DocRef['status'] = 'modified'): DocRef => ({ path, oldPath: path, status, kind: 'code' });
const text = (selector: string) => [...ui.shadow().querySelectorAll(selector)].map((el) => el.textContent);
const thread = (doc: DocRef): Thread => ({
  doc,
  side: 'head',
  line: 1,
  url: '#lock',
  comments: [{ author: 'Dana', body: 'Why the downgrade?', createdAt: new Date().toISOString(), url: '#lock' }],
});

it('folds files most reviewers skip, says so in the file menu, and opens one on request', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const lock = code('package-lock.json');
  const format = code('src/legacy/format.ts');
  const files = new Map<DocRef, DocContents>([
    [lock, { base: '{\n  "ms": "2.1.2"\n}\n', head: '{\n  "ms": "2.1.3"\n}\n' }],
    [format, { base: 'if (a) {\n    run();\n}\n', head: 'if (a) {\n  run();\n}\n' }],
  ]);
  const set = vi.fn(async () => {});
  await ui.open(review({ docs: [], codeDocs: [lock, format], load: async (doc) => files.get(doc)!, viewed: { label: 'GitHub', load: async () => [], set } }));
  // The lockfile is known by its name alone, so the suggested order puts it last.
  expect(text('.mr-quiet-name')).toEqual(['src/legacy/format.ts', 'package-lock.json']);
  expect(text('.mr-quiet-label')).toEqual(['Whitespace only', 'Lockfile']);
  expect(text('.mr-quiet .mr-chip')).toEqual(['1 added', '1 removed', '1 added', '1 removed']);
  expect(ui.shadow().querySelectorAll('.mr-code-line')).toHaveLength(0);
  expect(text('.mr-menu-quiet')).toEqual(['Whitespace only', 'Lockfile']);
  expect(ui.q('.mr-files-folded').textContent).toBe('2 folded');
  // A folded file can still be marked viewed.
  await vi.waitFor(() => expect(ui.q<HTMLButtonElement>('.mr-viewed').disabled).toBe(false));
  ui.click('[data-act="show-quiet"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-line')).toBeTruthy());
  expect(text('.mr-quiet-name')).toEqual(['package-lock.json']);
  expect(ui.q('.mr-files-folded').textContent).toBe('1 folded');
  // Turning code files off and on again keeps folded files folded.
  ui.click('[data-act="code-files"]');
  ui.click('[data-act="code-files"]');
  await ui.tick();
  expect(text('.mr-quiet-name')).toEqual(['package-lock.json']);
});

it('opens a folded file when its discussion arrives, even while viewed progress is still loading', async () => {
  const fingerprint = deferred<string>();
  vi.spyOn(viewed, 'viewedKey').mockReturnValue(fingerprint.promise);
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const early = code('yarn.lock');
  const late = code('Cargo.lock');
  const threads = deferred<Thread[]>();
  const loaded = deferred<DocContents>();
  const contents = { base: 'a 1\n', head: 'a 2\n' };
  const handle = openReader(
    review({
      docs: [],
      codeDocs: [late, early],
      load: async (doc) => (doc === early ? loaded.promise : contents),
      loadThreads: () => threads.promise,
    }),
  );
  await vi.waitFor(() => expect(text('.mr-quiet-name')).toEqual(['Cargo.lock']));
  // The discussion arrives after Cargo.lock folded, and before yarn.lock finished loading.
  threads.resolve([thread(late), thread(early)]);
  await vi.waitFor(() => expect(ui.shadow().querySelectorAll('.mr-quiet')).toHaveLength(0));
  loaded.resolve(contents);
  await vi.waitFor(() => expect(ui.shadow().querySelectorAll('.mr-document .mr-code-lines')).toHaveLength(2));
  expect(ui.shadow().querySelectorAll('.mr-quiet')).toHaveLength(0);
  fingerprint.resolve('galley:viewed:delayed');
  await ui.tick();
  handle.close();
});

it('shows code moved from one file to another at both ends, and maps what changed by declaration', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const quota = 'export function quota(client: string) {\n  const used = usage.get(client) ?? 0;\n  return limit - used;\n}\n';
  const from = code('src/limits.ts');
  const to = code('src/quota.ts', 'added');
  const files = new Map<DocRef, DocContents>([
    [from, { base: `${quota}export function keep() {\n  return 1;\n}\n`, head: 'export function keep() {\n  return 2;\n}\n' }],
    [to, { base: '', head: `${quota}export function spare() {\n  return 0;\n}\n` }],
  ]);
  await ui.open(review({ docs: [], codeDocs: [from, to], load: async (doc) => files.get(doc)! }));
  await connectFrame('spec-frame.html', serveSpecs, ui.shadow());
  await vi.waitFor(() => expect(text('.mr-move-link')).toEqual(['Moved to src/quota.ts, line 1', 'Moved from src/limits.ts, old line 1']));
  expect(text('.mr-chip.is-moved')).toEqual(['4 moved', '4 moved']);
  await vi.waitFor(() => expect(ui.shadow().querySelectorAll('.mr-symbol-plan')).toHaveLength(2));
  expect([...ui.shadow().querySelectorAll<HTMLElement>('.mr-symbol-link')].map((link) => link.dataset.status)).toEqual(['moved', 'edited', 'moved', 'added']);
});

const files = () => [...ui.shadow().querySelectorAll<HTMLElement>('.mr-document')].map((section) => section.getAttribute('aria-label'));

it('turns the top glow off and on in Appearance settings, and keeps the choice when reopened', async () => {
  await ui.open(review());
  expect(ui.q('[data-act="top-glow"]').getAttribute('aria-checked')).toBe('true');
  expect(ui.q('.mr-root').classList.contains('no-top-glow')).toBe(false);
  ui.click('[data-act="top-glow"]');
  expect(ui.q('[data-act="top-glow"]').getAttribute('aria-checked')).toBe('false');
  expect(ui.q('.mr-root').classList.contains('no-top-glow')).toBe(true);
  await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('galley:settings')!).topGlow).toBe(false));
  ui.close();
  await ui.open(review());
  expect(ui.q('[data-act="top-glow"]').getAttribute('aria-checked')).toBe('false');
  expect(ui.q('.mr-root').classList.contains('no-top-glow')).toBe(true);
  ui.click('[data-act="top-glow"]');
  expect(ui.q('[data-act="top-glow"]').getAttribute('aria-checked')).toBe('true');
  expect(ui.q('.mr-root').classList.contains('no-top-glow')).toBe(false);
});

it('reads each source file with its tests, and skippable files last, or as listed', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const docs = [code('package-lock.json'), code('src/quota.test.ts'), code('src/quota.ts'), code('src/other.ts')];
  await ui.open(review({ docs: [], codeDocs: docs, load: async () => ({ base: 'a = 1\n', head: 'a = 2\n' }) }));
  expect(files()).toEqual(['src/quota.ts', 'src/quota.test.ts', 'src/other.ts', 'package-lock.json']);
  expect(ui.q('.mr-file-name').textContent).toBe('quota.ts');
  ui.click('[data-setting="order"] [data-value="listed"]');
  expect(files()).toEqual(['package-lock.json', 'src/quota.test.ts', 'src/quota.ts', 'src/other.ts']);
  // The file being read stays the current one.
  expect(ui.q('.mr-file-name').textContent).toBe('quota.ts');
  ui.click('[data-setting="order"] [data-value="listed"]');
  ui.click('[data-setting="order"] [data-value="suggested"]');
  expect(files()[0]).toBe('src/quota.ts');
  // Show changes and Try again find their file wherever the order put it.
  ui.click('[data-act="show-quiet"]');
  await vi.waitFor(() => expect(ui.shadow().querySelector('.mr-quiet')).toBeNull());
});

it('lets folding be turned off, opening what was folded and reading new files in full', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const contents = { base: 'a 1\n', head: 'a 2\n' };
  await ui.open(review({ docs: [], codeDocs: [code('src/a.ts'), code('yarn.lock')], load: async () => contents }));
  expect(text('.mr-quiet-name')).toEqual(['yarn.lock']);
  expect(ui.q('[data-act="fold"]').getAttribute('aria-checked')).toBe('true');
  ui.click('[data-act="fold"]');
  expect(ui.q('[data-act="fold"]').getAttribute('aria-checked')).toBe('false');
  await vi.waitFor(() => expect(ui.shadow().querySelectorAll('.mr-document .mr-code-lines')).toHaveLength(2));
  ui.close();
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true, fold: false }));
  await ui.open(review({ docs: [], codeDocs: [code('Cargo.lock')], load: async () => contents }));
  expect(ui.shadow().querySelector('.mr-quiet')).toBeNull();
  expect(ui.q('.mr-code-lines')).toBeTruthy();
});

describe('picking up where the reader left off', () => {
  const guide: DocRef = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' };
  const later: DocRef = { path: 'docs/later.md', oldPath: 'docs/later.md', status: 'modified' };
  const source = (patch = {}) => review({ docs: [guide, later], ...patch });
  const remember = (path: string, offset: number) => positions.savePosition(source().diffUrl, path, offset);

  it('offers to continue in the file the reader was in, and goes there', async () => {
    await remember('docs/later.md', 50);
    await ui.open(source());
    await vi.waitFor(() => expect(ui.q('.mr-resume').hidden).toBe(false));
    expect(ui.q('.mr-resume-text').textContent).toBe('Pick up where you left off: later.md');
    ui.bounds(ui.q('[aria-label="docs/later.md"]'), 1200);
    ui.click('[data-act="resume"]');
    expect(ui.q('.mr-resume').hidden).toBe(true);
    expect(ui.q('.mr-root').scrollTop).toBe(900);
  });

  it('can be dismissed, or answered by reading on from the top', async () => {
    await remember('docs/later.md', 50);
    await ui.open(source());
    await vi.waitFor(() => expect(ui.q('.mr-resume').hidden).toBe(false));
    ui.click('[data-act="dismiss-resume"]');
    expect(ui.q('.mr-resume').hidden).toBe(true);
    ui.close();
    await ui.open(source());
    await vi.waitFor(() => expect(ui.q('.mr-resume').hidden).toBe(false));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    ui.q('.mr-root').scrollTop = 900;
    ui.q('.mr-root').dispatchEvent(new Event('scroll'));
    ui.flushFrame();
    expect(ui.q('.mr-resume').hidden).toBe(true);
    // Where the reader is now is remembered, for next time.
    ui.bounds(ui.q('.mr-root'), 0);
    ui.bounds(ui.q('[aria-label="docs/guide.md"]'), -300);
    vi.advanceTimersByTime(800);
    vi.useRealTimers();
    await vi.waitFor(async () => expect(await positions.loadPosition(source().diffUrl, ['docs/guide.md'])).toEqual({ path: 'docs/guide.md', offset: 300 }));
  });

  it.each([0, 599, 600])('offers to resume in the first file only after reading at least 600 pixels (saved at %i)', async (offset) => {
    await remember('docs/guide.md', offset);
    const loaded = vi.spyOn(positions, 'loadPosition');
    await ui.open(source());
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    // SHA-256 runs asynchronously: a timer tick can finish before the saved position is read.
    expect(await loaded.mock.results[0].value).toEqual({ path: 'docs/guide.md', offset });
    expect(ui.q('.mr-resume').hidden).toBe(offset < 600);
    if (offset >= 600) expect(ui.q('.mr-resume-text').textContent).toBe('Pick up where you left off: guide.md');
  });

  it('stays quiet when the saved file is no longer in the review', async () => {
    await remember('docs/gone.md', 900);
    const loaded = vi.spyOn(positions, 'loadPosition');
    await ui.open(source());
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    expect(await loaded.mock.results[0].value).toBeNull();
    expect(ui.q('.mr-resume').hidden).toBe(true);
  });

  it('stays quiet when opened at a requested file', async () => {
    await remember('docs/later.md', 900);
    await ui.open(source(), { start: 1 });
    expect(ui.q('.mr-resume').hidden).toBe(true);
    expect(ui.q('.mr-file-name').textContent).toBe('later.md');
  });

  it('stays quiet if reading began before the saved position arrives', async () => {
    const position = deferred<{ path: string; offset: number } | null>();
    const loaded = vi.spyOn(positions, 'loadPosition').mockReturnValue(position.promise);
    await ui.open(source());
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    ui.q('.mr-root').scrollTop = 400;
    position.resolve({ path: 'docs/later.md', offset: 900 });
    await position.promise;
    expect(ui.q('.mr-resume').hidden).toBe(true);
  });

  it('remembers a scroll made just before closing, and nothing before a review loads', async () => {
    await ui.open(source());
    ui.bounds(ui.q('.mr-root'), 0);
    ui.bounds(ui.q('[aria-label="docs/later.md"]'), -40);
    ui.bounds(ui.q('[aria-label="docs/guide.md"]'), -900);
    ui.q('.mr-root').dispatchEvent(new Event('scroll'));
    ui.flushFrame();
    ui.close();
    await vi.waitFor(async () => expect(await positions.loadPosition(source().diffUrl, ['docs/later.md'])).toEqual({ path: 'docs/later.md', offset: 40 }));
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const handle = openReader(new Promise(() => {}));
    ui.q('.mr-root').dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(800);
    vi.useRealTimers();
    handle.close();
    expect(localStorage.getItem('galley:positions')).toBeNull();
  });

  it('does nothing if the reader closes before the position is read', async () => {
    const position = deferred<{ path: string; offset: number } | null>();
    const loaded = vi.spyOn(positions, 'loadPosition').mockReturnValue(position.promise);
    await ui.open(source());
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    ui.close();
    position.resolve({ path: 'docs/later.md', offset: 900 });
    await position.promise;
    expect(document.querySelector('#galley-reader')).toBeNull();
  });
});

it('folds any file to one line from its byline, and opens it again as it was', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const guide: DocRef = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' };
  const lock = code('yarn.lock');
  const contents = new Map<DocRef, DocContents>([
    [guide, { base: 'Ten requests.\n', head: 'Twenty requests.\n' }],
    [lock, { base: 'a 1\n', head: 'a 2\n' }],
  ]);
  await ui.open(review({ docs: [guide], codeDocs: [code('src/a.ts'), lock], load: async (doc) => contents.get(doc) ?? { base: 'x = 1\n', head: 'x = 2\n' } }));
  const section = (path: string) => ui.q(`[aria-label="${path}"]`);
  // Folding the file being read keeps its card in view.
  ui.bounds(ui.q('.mr-root'), 0);
  ui.bounds(section('docs/guide.md'), -400);
  section('docs/guide.md').querySelector<HTMLButtonElement>('[data-act="fold-file"]')!.click();
  expect(section('docs/guide.md').classList.contains('is-folded')).toBe(true);
  expect(section('docs/guide.md').querySelector('.mr-quiet-meta')!.textContent).toBe('Folded1 edited');
  expect(ui.scroll).toHaveBeenCalled();
  section('src/a.ts').querySelector<HTMLButtonElement>('[data-act="fold-file"]')!.click();
  expect(text('.mr-quiet .mr-quiet-label')).toEqual(['Folded', 'Folded', 'Lockfile']);
  expect(text('.mr-menu-quiet')).toEqual(['Folded', 'Folded', 'Lockfile']);
  expect(ui.q('.mr-files-folded').textContent).toBe('3 folded');
  // Show changes opens a folded file at once: it was never unloaded.
  section('src/a.ts').querySelector<HTMLButtonElement>('[data-act="show-quiet"]')!.click();
  expect(section('src/a.ts').classList.contains('is-folded')).toBe(false);
  expect(section('src/a.ts').querySelector('.mr-quiet')).toBeNull();
  // A file Galley folded and the reviewer opened folds back to what it is.
  section('yarn.lock').querySelector<HTMLButtonElement>('[data-act="show-quiet"]')!.click();
  await vi.waitFor(() => expect(section('yarn.lock').querySelector('[data-act="fold-file"]')).toBeTruthy());
  section('yarn.lock').querySelector<HTMLButtonElement>('[data-act="fold-file"]')!.click();
  expect(section('yarn.lock').querySelector('.mr-quiet-label')!.textContent).toBe('Lockfile');
  section('yarn.lock').querySelector<HTMLButtonElement>('[data-act="show-quiet"]')!.click();
  expect(section('yarn.lock').querySelector('.mr-code-lines')).toBeTruthy();
  expect(section('yarn.lock').classList.contains('is-quiet')).toBe(false);
});

describe('viewed files fold away', () => {
  const contents = { base: 'a 1\n', head: 'a 2\n' };
  const section = (path: string) => ui.q(`[aria-label="${path}"]`);
  const toggle = (path: string) => section(path).querySelector<HTMLButtonElement>('.mr-file-viewed')!;
  const folded = (path: string) => section(path).classList.contains('is-folded');

  it('checks a file from its byline or folded card, folding it, and opens it again when unchecked', async () => {
    localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
    const set = vi.fn(async () => {});
    await ui.open(
      review({ docs: [], codeDocs: [code('src/a.ts'), code('yarn.lock')], load: async () => contents, viewed: { label: 'GitHub', load: async () => [], set } }),
    );
    await vi.waitFor(() => expect(toggle('src/a.ts').disabled).toBe(false));
    expect(toggle('src/a.ts').getAttribute('aria-checked')).toBe('false');
    toggle('src/a.ts').click();
    await vi.waitFor(() => expect(folded('src/a.ts')).toBe(true));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: 'src/a.ts' }), true);
    // The folded card carries the same check, ticked.
    expect(toggle('src/a.ts').closest('.mr-quiet')).toBeTruthy();
    expect(toggle('src/a.ts').getAttribute('aria-checked')).toBe('true');
    toggle('src/a.ts').click();
    await vi.waitFor(() => expect(folded('src/a.ts')).toBe(false));
    // A lockfile Galley folded can be checked without opening it.
    toggle('yarn.lock').click();
    await vi.waitFor(() => expect(toggle('yarn.lock').getAttribute('aria-checked')).toBe('true'));
    expect(section('yarn.lock').querySelector('.mr-code-lines')).toBeNull();
  });

  it('folds files already viewed as the review opens, unless the reviewer opens them', async () => {
    localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
    const late = deferred<DocContents>();
    // Viewed status known before the file renders, and after.
    const viewedPaths = deferred<string[]>();
    const handle = openReader(
      review({
        docs: [],
        codeDocs: [code('src/a.ts'), code('src/b.ts'), code('src/c.ts'), code('yarn.lock')],
        load: async (doc) => (doc.path === 'src/c.ts' ? late.promise : contents),
        viewed: { label: 'GitHub', load: () => viewedPaths.promise, set: vi.fn(async () => {}) },
      }),
    );
    await vi.waitFor(() => expect(ui.shadow().querySelector('[aria-label="src/b.ts"] .mr-file-viewed')).toBeTruthy());
    // Folded by hand before the status arrives: still one card.
    section('src/b.ts').querySelector<HTMLButtonElement>('[data-act="fold-file"]')!.click();
    viewedPaths.resolve(['src/a.ts', 'src/b.ts', 'src/c.ts', 'yarn.lock']);
    await vi.waitFor(() => expect(folded('src/a.ts')).toBe(true));
    expect(section('src/b.ts').querySelectorAll('.mr-quiet')).toHaveLength(1);
    late.resolve(contents);
    await vi.waitFor(() => expect(folded('src/c.ts')).toBe(true));
    // A viewed lockfile the reviewer opens stays open.
    section('yarn.lock').querySelector<HTMLButtonElement>('[data-act="show-quiet"]')!.click();
    await vi.waitFor(() => expect(section('yarn.lock').querySelector('.mr-code-lines')).toBeTruthy());
    expect(folded('yarn.lock')).toBe(false);
    handle.close();
  });

  it('folds files viewed in this browser when the review is opened again', async () => {
    localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
    const source = () => review({ docs: [], codeDocs: [code('src/a.ts')], load: async () => contents });
    await ui.open(source());
    await vi.waitFor(() => expect(toggle('src/a.ts').disabled).toBe(false));
    toggle('src/a.ts').click();
    await vi.waitFor(() => expect(folded('src/a.ts')).toBe(true));
    ui.close();
    localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
    await ui.open(source());
    await vi.waitFor(() => expect(folded('src/a.ts')).toBe(true));
  });
});

it('lists every file in the margin in the Files layout, the current one open to its headings', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true, layout: 'files', scope: 'all' }));
  const guide: DocRef = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' };
  const sections = '# Guide\n\nIntro.\n\n## One\n\nA.\n\n## Two\n\nB.\n\n## Three\n\nC.\n';
  const contents = new Map<DocRef, DocContents>([[guide, { base: sections, head: sections.replace('A.', 'A!') }]]);
  const set = vi.fn(async () => {});
  await ui.open(
    review({
      docs: [guide],
      codeDocs: [code('src/a.ts'), code('yarn.lock')],
      load: async (doc) => contents.get(doc) ?? { base: 'a 1\n', head: 'a 2\n' },
      viewed: { label: 'GitHub', load: async () => [], set },
    }),
  );
  await vi.waitFor(() => expect(ui.q('.mr-file-list')).toBeTruthy());
  expect(ui.q('.mr-file-list .mr-toc-title').textContent).toBe('3 files');
  expect(text('.mr-file-link')).toEqual(['guide.md', 'a.ts', 'yarn.lock']);
  expect(ui.q('.mr-file-link.is-current').textContent).toBe('guide.md');
  expect(text('.mr-file-headings a')).toEqual(['One', 'Two', 'Three']);
  expect(ui.q('.mr-file-link:last-of-type').classList.contains('is-folded')).toBe(true);
  // Checked files are ticked in the list; choosing one goes there.
  await vi.waitFor(() => expect(ui.q<HTMLButtonElement>('[aria-label="src/a.ts"] .mr-file-viewed').disabled).toBe(false));
  ui.click('[aria-label="src/a.ts"] .mr-file-viewed');
  await vi.waitFor(() => expect(ui.shadow().querySelector('.mr-file-link .mr-file-check')).toBeTruthy());
  ui.click('.mr-file-link[data-doc="1"]');
  expect(ui.q('.mr-file-link.is-current').textContent).toContain('a.ts');
  expect(ui.shadow().querySelector('.mr-file-headings a')).toBeNull();
  // Code starts beside the list here, so nothing passes beneath it.
  ui.q('.mr-root').dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-toc').classList.contains('is-covered')).toBe(false);
  // In other layouts the margin holds the current document's contents again.
  ui.click('[data-setting="layout"] [data-value="balanced"]');
  ui.click('.mr-menu-item[data-doc="0"]');
  expect(ui.shadow().querySelector('.mr-file-list')).toBeNull();
  expect(ui.q('.mr-toc .mr-toc-title').textContent).toBe('Contents');
});
