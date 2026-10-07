import { expect, it } from 'vitest';
import { headersOf, jsonResponse, mockFetch } from '../testing/http.ts';
import { directApi } from './github-api.ts';
import { loadGitHub } from './github.ts';
import { getToken, setToken } from './tokens.ts';
import type { CommentTarget } from './types.ts';

const patch = '@@ -1,4 +1,5 @@\n # Guide\n-old wording\n+new wording\n+another line\n context\n end';
const doc = { path: 'new.md', oldPath: 'old.md', status: 'renamed' as const };
const target: CommentTarget = { doc, side: 'head', startLine: 2, endLine: 3, quote: 'new wording\nanother line' };
const response = jsonResponse;

it('GitHub posts ordinary inline/file comments, keeps the reviewed head, and checks fresh tokens', async () => {
  await setToken('https://github.com', 'write-token');
  const writes: Array<Record<string, unknown>> = [];
  let head = 'head-sha';
  mockFetch(async (url, init) => {
    if (init?.method === 'POST') {
      writes.push(JSON.parse(init.body as string));
      expect(headersOf(init).Authorization).toBe('Bearer write-token');
      expect(init.credentials).toBe('omit');
      return response({ html_url: 'https://github.com/acme/docs/pull/1#discussion-1' }, 201);
    }
    if (String(url).includes('/files?')) return response([{ filename: 'new.md', previous_filename: 'old.md', status: 'renamed', changes: 2, patch, raw_url: 'https://github.com/acme/docs/raw/base-sha/new.md' }]);
    return response({ head: { sha: head }, base: { sha: 'base-sha' } });
  });
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 1, title: 'Docs' }, directApi('https://github.com', getToken));
  const selected = { ...target, doc: source.docs[0] };
  const inline = await source.prepareComment!(selected);
  expect(inline.kind).toBe('inline');
  await inline.post('Please clarify');
  expect(writes[0].path).toBe('new.md');
  expect(writes[0].commit_id).toBe('head-sha');
  expect(writes[0].start_line).toBe(2);
  expect(writes[0].line).toBe(3);
  expect(writes[0].side).toBe('RIGHT');
  expect(writes[0].body).toBe('Please clarify\n\n---\n` new.md ` · new lines 2–3\n\n```\nnew wording\nanother line\n```');
  const old = await source.prepareComment!({ ...selected, side: 'base', startLine: 2, endLine: 2 });
  await old.post('Why remove this?');
  expect(writes[1].side).toBe('LEFT');
  expect(writes[1].line).toBe(2);
  const file = await source.prepareComment!({ ...selected, startLine: 10, endLine: 12 });
  expect(file.kind).toBe('file');
  await file.post('Outside diff');
  expect(writes[2].subject_type).toBe('file');
  expect(writes[2].line).toBe(undefined);
  head = 'new-head';
  await expect(inline.post('Stale comment')).rejects.toThrow(/changed while you were reading/);
  expect(writes).toHaveLength(3);
  await setToken('https://github.com', null);
  await expect(inline.post('No token')).rejects.toThrow(/Add a GitHub token/);
  expect(writes).toHaveLength(3);
});

it('GitHub preserves permission failures and never retries a rejected write as another comment type', async () => {
  await setToken('https://github.com', 'read-only');
  let posts = 0;
  mockFetch(async (url, init) => {
    if (init?.method === 'POST') { posts++; return response({}, 403); }
    if (String(url).includes('/files?')) return response([{ filename: 'new.md', status: 'modified', changes: 2, patch, raw_url: '' }]);
    return response({ head: { sha: 'h' }, base: { sha: 'b' } });
  });
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'a', repo: 'b', number: 1, title: '' }, directApi('https://github.com', getToken));
  const plan = await source.prepareComment!({ ...target, doc: source.docs[0] });
  await expect(plan.post('')).rejects.toThrow(/Write a comment/);
  await expect(plan.post('Hello')).rejects.toThrow(/did not allow/);
  expect(posts).toBe(1);
  await expect(source.prepareComment!(target)).rejects.toThrow(/Select a paragraph/);
});

it('GitHub offers source files after docs without fetching them until requested, and posts native code comments', async () => {
  await setToken('https://github.com', 'write-token');
  const codePatch = '@@ -1 +1 @@\n-const value = 1;\n+const value = 2;';
  let rawReads = 0;
  const writes: Array<Record<string, unknown>> = [];
  mockFetch(async (url, init) => {
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
  const source = await loadGitHub({ platform: 'github', key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'a', repo: 'b', number: 1, title: '' }, directApi('https://github.com', getToken));
  expect(source.docs.map((doc) => doc.path)).toStrictEqual(['README.md']);
  expect(source.codeDocs!.map((doc) => doc.path)).toStrictEqual(['src/main.ts', 'src/renamed.unknown']);
  expect(rawReads).toBe(0);
  expect(await source.load(source.codeDocs![0])).toStrictEqual({ base: 'const value = 1;\n', head: 'const value = 2;\n' });
  expect(rawReads).toBe(1);
  const plan = await source.prepareComment!({ doc: source.codeDocs![0], side: 'head', startLine: 1, endLine: 1, quote: 'const value = 2;' });
  expect(plan.kind).toBe('inline'); await plan.post('Explain this value');
  expect(writes[0].path).toBe('src/main.ts'); expect(writes[0].line).toBe(1); expect(writes[0].side).toBe('RIGHT');
});

const ctx = { platform: 'github' as const, key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'a', repo: 'b', number: 1, title: '' };
const load = () => loadGitHub(ctx, directApi(ctx.origin, getToken));

interface Failure {
  name: string;
  status: number;
  headers: Record<string, string>;
  token: boolean;
  message: RegExp;
  hint: RegExp;
  needsToken: boolean;
}

/** Every way GitHub can refuse a request becomes a message that says what to do next. */
it.each<Failure>([
  { name: 'rate limit, no token', status: 403, headers: { 'x-ratelimit-remaining': '0' }, token: false, message: /rate limit reached/, hint: /Add a read-only token/, needsToken: true },
  { name: 'rate limit, with token', status: 429, headers: { 'x-ratelimit-remaining': '0' }, token: true, message: /rate limit reached/, hint: /Wait a few minutes/, needsToken: false },
  { name: 'SSO not authorised', status: 403, headers: { 'x-github-sso': 'required' }, token: true, message: /not authorized for this organization/, hint: /Authorize the token/, needsToken: true },
  { name: 'bad token', status: 401, headers: {}, token: true, message: /rejected the token/, hint: /Replace it/, needsToken: true },
  { name: 'private repository, no token', status: 404, headers: {}, token: false, message: /private repository/, hint: /Add a read-only GitHub token/, needsToken: true },
  { name: 'token cannot see it', status: 404, headers: {}, token: true, message: /could not find this pull request/, hint: /Contents and Pull requests/, needsToken: true },
  { name: 'server error', status: 500, headers: {}, token: false, message: /returned an error \(500\)/, hint: /Try again/, needsToken: false },
])('explains a GitHub failure: $name', async ({ status, headers, token, message, hint, needsToken }) => {
  if (token) await setToken(ctx.origin, 'github_pat_x');
  mockFetch(() => new Response('{}', { status, headers }));
  await expect(load()).rejects.toMatchObject({ message: expect.stringMatching(message), hint: expect.stringMatching(hint), needsToken });
});

it('explains a network failure', async () => {
  mockFetch(() => {
    throw new TypeError('Failed to fetch');
  });
  await expect(load()).rejects.toMatchObject({ message: 'Could not reach GitHub.' });
});

it('loads the review threads of the pull request, replies included', async () => {
  const at = '2026-10-01T10:00:00Z';
  const comment = (id: number, extra: Record<string, unknown>) => ({ id, path: 'new.md', body: `comment ${id}`, user: { login: 'dana' }, created_at: at, html_url: `https://github.com/a/b/pull/1#r${id}`, ...extra });
  mockFetch((url) => {
    if (url.includes('/comments?')) return response([comment(1, { line: 3, side: 'RIGHT' }), comment(2, { in_reply_to_id: 1 }), comment(3, { path: 'elsewhere.ts', line: 1, side: 'RIGHT' })]);
    if (url.includes('/files?')) return response([{ filename: 'new.md', status: 'modified', changes: 1, patch, raw_url: '' }]);
    return response({ head: { sha: 'h' }, base: { sha: 'b' } });
  });
  const source = await load();
  const threads = await source.loadThreads!();
  expect(threads).toHaveLength(1);
  expect(threads[0]).toMatchObject({ side: 'head', line: 3, doc: { path: 'new.md' } });
  expect(threads[0].comments.map((c) => c.body)).toStrictEqual(['comment 1', 'comment 2']);
});
