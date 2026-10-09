import { expect, it, vi } from 'vitest';
import { deferred, readerHarness, review } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';
import { openReader } from './reader.ts';
import { serveSpecs } from './spec-frame.ts';
import * as viewed from './viewed.ts';
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
  expect(text('.mr-quiet-name')).toEqual(['package-lock.json', 'src/legacy/format.ts']);
  expect(text('.mr-quiet-label')).toEqual(['Lockfile', 'Whitespace only']);
  expect(text('.mr-quiet .mr-chip')).toEqual(['1 added', '1 removed', '1 added', '1 removed']);
  expect(ui.shadow().querySelectorAll('.mr-code-line')).toHaveLength(0);
  expect(text('.mr-menu-quiet')).toEqual(['Lockfile', 'Whitespace only']);
  expect(ui.q('.mr-files-folded').textContent).toBe('2 folded');
  // A folded file can still be marked viewed.
  await vi.waitFor(() => expect(ui.q<HTMLButtonElement>('.mr-viewed').disabled).toBe(false));
  ui.click('[data-act="show-quiet"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-line')).toBeTruthy());
  expect(text('.mr-quiet-name')).toEqual(['src/legacy/format.ts']);
  expect(ui.q('.mr-files-folded').textContent).toBe('1 folded');
  // Turning code files off and on again keeps folded files folded.
  ui.click('[data-act="code-files"]');
  ui.click('[data-act="code-files"]');
  await ui.tick();
  expect(text('.mr-quiet-name')).toEqual(['src/legacy/format.ts']);
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
  expect(text('.mr-symbol-plan .mr-spec-status')).toEqual(['Moved', 'Edited', 'Moved', 'Added']);
});
