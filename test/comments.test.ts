import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { loadGitHub } from '../src/platforms/github.ts';
import { loadGitLab } from '../src/platforms/gitlab.ts';
import { diffLines, diffRange } from '../src/platforms/comments.ts';
import { setToken } from '../src/ui/settings.ts';
import type { CommentTarget } from '../src/platforms/types.ts';

const patch = '@@ -1,4 +1,5 @@\n # Guide\n-old wording\n+new wording\n+another line\n context\n end';
const doc = { path: 'new.md', oldPath: 'old.md', status: 'renamed' as const };
const target: CommentTarget = { doc, side: 'head', startLine: 2, endLine: 3, quote: 'new wording\nanother line' };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

function globalValue(t: TestContext, name: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); });
}

function storage(t: TestContext) {
  const values = new Map<string, string>();
  globalValue(t, 'localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
}

test('diff coordinates distinguish additions, deletions, shifted context and separate hunks', () => {
  assert.deepEqual(diffLines(patch).map(({ oldLine, newLine }) => [oldLine, newLine]), [[1,1], [2,undefined], [undefined,2], [undefined,3], [3,4], [4,5]]);
  assert.equal(diffRange(patch, target)?.length, 2);
  assert.equal(diffRange(patch, { ...target, startLine: 1, endLine: 8 }), null);
  assert.equal(diffRange('@@ -1 +1 @@\n one\n@@ -2 +2 @@\n two', { ...target, startLine: 1, endLine: 2 }), null);
});

test('GitHub posts ordinary inline/file comments, keeps the reviewed head, and checks fresh tokens', async (t) => {
  storage(t);
  await setToken('https://github.com', 'write-token');
  const writes: Array<Record<string, unknown>> = [];
  let head = 'head-sha';
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      writes.push(JSON.parse(init.body as string));
      assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer write-token');
      assert.equal(init.credentials, 'omit');
      return response({ html_url: 'https://github.com/acme/docs/pull/1#discussion-1' }, 201);
    }
    if (String(url).includes('/files?')) return response([{ filename: 'new.md', previous_filename: 'old.md', status: 'renamed', changes: 2, patch, raw_url: 'https://github.com/acme/docs/raw/base-sha/new.md' }]);
    return response({ head: { sha: head }, base: { sha: 'base-sha' } });
  });
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 1, title: 'Docs' }, null);
  const selected = { ...target, doc: source.docs[0] };
  const inline = await source.prepareComment!(selected);
  assert.equal(inline.kind, 'inline');
  await inline.post('Please clarify');
  assert.equal(writes[0].path, 'new.md');
  assert.equal(writes[0].commit_id, 'head-sha');
  assert.equal(writes[0].start_line, 2);
  assert.equal(writes[0].line, 3);
  assert.equal(writes[0].side, 'RIGHT');
  assert.match(writes[0].body as string, /> new wording/);
  const old = await source.prepareComment!({ ...selected, side: 'base', startLine: 2, endLine: 2 });
  await old.post('Why remove this?');
  assert.equal(writes[1].side, 'LEFT');
  assert.equal(writes[1].line, 2);
  const file = await source.prepareComment!({ ...selected, startLine: 10, endLine: 12 });
  assert.equal(file.kind, 'file');
  await file.post('Outside diff');
  assert.equal(writes[2].subject_type, 'file');
  assert.equal(writes[2].line, undefined);
  head = 'new-head';
  await assert.rejects(inline.post('Stale comment'), /changed while you were reading/);
  assert.equal(writes.length, 3);
  await setToken('https://github.com', null);
  await assert.rejects(inline.post('No token'), /Add a GitHub token/);
  assert.equal(writes.length, 3);
});

test('GitHub preserves permission failures and never retries a rejected write as another comment type', async (t) => {
  storage(t);
  await setToken('https://github.com', 'read-only');
  let posts = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { posts++; return response({}, 403); }
    if (String(url).includes('/files?')) return response([{ filename: 'new.md', status: 'modified', changes: 2, patch, raw_url: '' }]);
    return response({ head: { sha: 'h' }, base: { sha: 'b' } });
  });
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'a', repo: 'b', number: 1, title: '' }, 'read-only');
  const plan = await source.prepareComment!({ ...target, doc: source.docs[0] });
  await assert.rejects(plan.post(''), /Write a comment/);
  await assert.rejects(plan.post('Hello'), /did not allow/);
  assert.equal(posts, 1);
  await assert.rejects(source.prepareComment!(target), /Select a paragraph/);
});

test('GitLab uses the native session, CSRF, shifted context and diff refs for inline comments', async (t) => {
  storage(t);
  globalValue(t, 'document', { querySelector: () => ({ content: 'session-csrf' }) });
  const writes: Array<Record<string, any>> = [];
  const refs = { base_sha: 'b', head_sha: 'h', start_sha: 's' };
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      assert.equal((init.headers as Record<string, string>)['X-CSRF-Token'], 'session-csrf');
      assert.equal(init.credentials, 'same-origin');
      writes.push(JSON.parse(init.body as string));
      return response({ notes: [{ id: 42 }] }, 201);
    }
    if (String(url).includes('/diffs?')) return response([{ new_path: 'new.md', old_path: 'old.md', renamed_file: true, diff: patch }]);
    return response({ title: 'Docs', diff_refs: refs });
  });
  const source = await loadGitLab({ platform: 'gitlab', key: '', origin: 'https://git.example.com', prefix: '/gitlab', projectPath: 'nested/docs', projectId: null, iid: 7 });
  const selected = { ...target, doc: source.docs[0] };
  const inline = await source.prepareComment!(selected);
  assert.equal(inline.kind, 'inline');
  assert.match((await inline.post('Read this')).url, /\/gitlab\/nested\/docs\/-\/merge_requests\/7#note_42$/);
  assert.deepEqual({ base: writes[0].position.base_sha, head: writes[0].position.head_sha, start: writes[0].position.start_sha }, { base: 'b', head: 'h', start: 's' });
  assert.equal(writes[0].position.old_line, undefined);
  assert.equal(writes[0].position.new_line, 3);
  assert.equal(writes[0].position.line_range.start.new_line, 2);
  assert.match(writes[0].position.line_range.start.line_code, /_3_2$/);
  assert.match(writes[0].position.line_range.end.line_code, /_3_3$/);
  const context = await source.prepareComment!({ ...selected, startLine: 4, endLine: 4 });
  await context.post('Context');
  assert.equal(writes[1].position.old_line, 3);
  assert.equal(writes[1].position.new_line, 4);
  const outside = await source.prepareComment!({ ...selected, startLine: 10, endLine: 10 });
  assert.equal(outside.kind, 'discussion');
  await outside.post('Outside diff');
  assert.equal(writes[2].position, undefined);
  refs.head_sha = 'changed';
  // Snapshot must stay immutable even when a fixture object changes.
  await assert.rejects(inline.post('Stale'), /changed while you were reading/);
  assert.equal(writes.length, 3);
});

test('GitHub offers source files after docs without fetching them until requested, and posts native code comments', async (t) => {
  storage(t);
  await setToken('https://github.com', 'write-token');
  const codePatch = '@@ -1 +1 @@\n-const value = 1;\n+const value = 2;';
  let rawReads = 0;
  const writes: Array<Record<string, unknown>> = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { writes.push(JSON.parse(init.body as string)); return response({ html_url: 'https://github.com/a/b/pull/1#discussion-1' }, 201); }
    if (String(url).includes('/raw/')) { rawReads++; return new Response('const value = 2;\n'); }
    if (String(url).includes('/files?')) return response([
      { filename: 'src/main.ts', status: 'modified', changes: 2, patch: codePatch, raw_url: '' },
      { filename: 'image.png', status: 'added', changes: 0, raw_url: '' },
      { filename: 'README.md', status: 'modified', changes: 2, patch, raw_url: '' },
      { filename: 'src/renamed.unknown', previous_filename: 'src/old.py', status: 'renamed', changes: 0, raw_url: '' },
    ]);
    return response({ head: { sha: 'h' }, base: { sha: 'b' } });
  });
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'a', repo: 'b', number: 1, title: '' }, null);
  assert.deepEqual(source.docs.map((doc) => doc.path), ['README.md']);
  assert.deepEqual(source.codeDocs!.map((doc) => doc.path), ['src/main.ts', 'src/renamed.unknown']);
  assert.equal(rawReads, 0);
  assert.deepEqual(await source.load(source.codeDocs![0]), { base: 'const value = 1;\n', head: 'const value = 2;\n' });
  assert.equal(rawReads, 1);
  const plan = await source.prepareComment!({ doc: source.codeDocs![0], side: 'head', startLine: 1, endLine: 1, quote: 'const value = 2;' });
  assert.equal(plan.kind, 'inline'); await plan.post('Explain this value');
  assert.equal(writes[0].path, 'src/main.ts'); assert.equal(writes[0].line, 1); assert.equal(writes[0].side, 'RIGHT');
});

test('GitLab offers source-only reviews and sends old-side source comments with native diff positions', async (t) => {
  storage(t);
  globalValue(t, 'document', { querySelector: () => ({ content: 'session-csrf' }) });
  const codePatch = '@@ -1 +1 @@\n-old value\n+new value';
  let rawReads = 0;
  const writes: Array<Record<string, any>> = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { writes.push(JSON.parse(init.body as string)); return response({ notes: [{ id: 17 }] }, 201); }
    if (String(url).includes('/raw?')) { rawReads++; return new Response(String(url).endsWith('ref=b') ? 'old value\n' : 'new value\n'); }
    if (String(url).includes('/diffs?')) return response([
      { new_path: 'src/main.py', old_path: 'src/main.py', diff: codePatch },
      { new_path: 'photo.jpg', old_path: 'photo.jpg' },
    ]);
    return response({ title: 'Code only', diff_refs: { base_sha: 'b', head_sha: 'h', start_sha: 's' } });
  });
  const source = await loadGitLab({ platform: 'gitlab', key: '', origin: 'https://git.example.com', prefix: '', projectPath: 'a/b', projectId: null, iid: 7 });
  assert.equal(source.docs.length, 0); assert.equal(source.codeDocs!.length, 1); assert.equal(rawReads, 0);
  assert.deepEqual(await source.load(source.codeDocs![0]), { base: 'old value\n', head: 'new value\n' }); assert.equal(rawReads, 2);
  const plan = await source.prepareComment!({ doc: source.codeDocs![0], side: 'base', startLine: 1, endLine: 1, quote: 'old value' });
  assert.equal(plan.kind, 'inline'); await plan.post('Why remove this?');
  assert.equal(writes[0].position.old_path, 'src/main.py'); assert.equal(writes[0].position.old_line, 1); assert.equal(writes[0].position.new_line, undefined);
});
