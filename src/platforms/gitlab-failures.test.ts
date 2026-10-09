import { expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '../testing/http.ts';
import { loadGitLab } from './gitlab.ts';
import type { CommentTarget } from './types.ts';

const ctx = { platform: 'gitlab' as const, key: '', origin: 'https://git.example.com', prefix: '', projectPath: 'team/docs', projectId: '10', iid: 7 };
const refs = { base_sha: 'b', head_sha: 'h', start_sha: 's' };
const mergeRequest = { title: 'Docs', diff_refs: refs };
const patch = '@@ -1,2 +1,2 @@\n # Guide\n-old wording\n+new wording';
const diff = { new_path: 'guide.md', old_path: 'guide.md', diff: patch };

/** Answers like GitLab: the merge request, its diffs and discussions, unless a route says otherwise. */
function gitlab(routes: Record<string, (url: string, init?: RequestInit) => Response | Promise<Response>> = {}) {
  return mockFetch(async (url, init) => {
    for (const [part, answer] of Object.entries(routes)) if (url.includes(part)) return answer(url, init);
    if (url.includes('/diffs?')) return jsonResponse([diff]);
    if (url.includes('/discussions?')) return jsonResponse([]);
    return jsonResponse(mergeRequest);
  });
}

it.each([
  [401, 'GitLab did not return this merge request.'],
  [403, 'GitLab did not return this merge request.'],
  [404, 'GitLab did not return this merge request.'],
  [429, 'GitLab rate limit reached.'],
  [502, 'GitLab returned an error (502).'],
])('explains a %i from GitLab in words the reviewer can act on', async (status, message) => {
  gitlab({ [`merge_requests/7`]: () => jsonResponse({}, status) });
  await expect(loadGitLab(ctx)).rejects.toThrow(message);
});

it('explains an unreachable GitLab, and passes through anything that is not an HTTP failure', async () => {
  mockFetch(async () => { throw new TypeError('offline'); });
  await expect(loadGitLab(ctx)).rejects.toThrow('Could not reach GitLab.');
  mockFetch(async () => new Response('not json', { status: 200 }));
  await expect(loadGitLab(ctx)).rejects.toThrow(SyntaxError);
});

it('waits for GitLab to finish preparing the diff before reading', async () => {
  gitlab({ [`merge_requests/7`]: (url) => (url.endsWith('/7') ? jsonResponse({ title: 'Docs', diff_refs: null }) : jsonResponse([])) });
  await expect(loadGitLab(ctx)).rejects.toThrow('GitLab is still preparing the diff');
});

it('reads every page of diffs, and falls back to /changes on GitLab versions without /diffs', async () => {
  const pages: string[] = [];
  gitlab({
    '/diffs?': (url) => {
      pages.push(new URL(url).searchParams.get('page')!);
      return url.endsWith('page=1')
        ? new Response(JSON.stringify([diff]), { headers: { 'x-next-page': '2' } })
        : jsonResponse([{ new_path: 'added.md', old_path: 'added.md', new_file: true, diff: '' }, { new_path: 'gone.md', old_path: 'gone.md', deleted_file: true, diff: '' }]);
    },
  });
  const source = await loadGitLab(ctx);
  expect(pages).toEqual(['1', '2']);
  expect(source.docs.map((doc) => [doc.path, doc.status])).toEqual([['guide.md', 'modified'], ['added.md', 'added'], ['gone.md', 'removed']]);

  gitlab({ '/diffs?': () => jsonResponse({}, 404), '/changes': () => jsonResponse({ changes: [diff] }) });
  expect((await loadGitLab(ctx)).docs.map((doc) => doc.path)).toEqual(['guide.md']);

  gitlab({ '/diffs?': () => jsonResponse({}, 500) });
  await expect(loadGitLab(ctx)).rejects.toThrow('GitLab returned an error (500).');
});

it('reads each version from its own commit, skips the missing side of a new or deleted file, and links to the head', async () => {
  const reads: string[] = [];
  gitlab({
    '/diffs?': () => jsonResponse([diff, { new_path: 'new.md', old_path: 'new.md', new_file: true, diff: '' }, { new_path: 'gone.md', old_path: 'gone.md', deleted_file: true, diff: '' }]),
    '/repository/files/': (url) => { reads.push(url); return new Response(url.includes('ref=b') ? 'old' : 'new'); },
  });
  const source = await loadGitLab(ctx);
  expect(await source.load(source.docs[0])).toEqual({ base: 'old', head: 'new' });
  expect(await source.load(source.docs[1])).toEqual({ base: '', head: 'new' });
  expect(await source.load(source.docs[2])).toEqual({ base: 'old', head: '' });
  expect(reads).toEqual([
    'https://git.example.com/api/v4/projects/10/repository/files/guide.md/raw?ref=b',
    'https://git.example.com/api/v4/projects/10/repository/files/guide.md/raw?ref=h',
    'https://git.example.com/api/v4/projects/10/repository/files/new.md/raw?ref=h',
    'https://git.example.com/api/v4/projects/10/repository/files/gone.md/raw?ref=b',
  ]);
  expect(source.links(source.docs[0]).raw('docs/a b.md')).toBe('https://git.example.com/team/docs/-/raw/h/docs/a%20b.md');
  expect(source.links(source.docs[0]).blob('docs/a b.md')).toBe('https://git.example.com/team/docs/-/blob/h/docs/a%20b.md');
  gitlab({ '/repository/files/': () => jsonResponse({}, 403) });
  await expect((await loadGitLab(ctx)).load({ path: 'guide.md', oldPath: 'guide.md', status: 'modified' })).rejects.toThrow('GitLab did not return this merge request.');
});

it('requires a session token for comments and gives additions their new-side multiline coordinates', async () => {
  vi.stubGlobal('document', { querySelector: () => null });
  const patch = '@@ -1 +1,3 @@\n # Guide\n+first addition\n+second addition';
  gitlab({ '/diffs?': () => jsonResponse([{ ...diff, diff: patch }]) });
  const source = await loadGitLab(ctx);
  const plan = await source.prepareComment!({ doc: source.docs[0], side: 'head', startLine: 2, endLine: 3, quote: 'first addition\nsecond addition' });
  await expect(plan.post('Check this')).rejects.toThrow('session token is missing');
  vi.stubGlobal('document', { querySelector: () => ({ content: 'csrf' }) });
  const writes: Record<string, unknown>[] = [];
  gitlab({ '/discussions': (_url, init) => { writes.push(JSON.parse(init!.body as string)); return jsonResponse({ id: 'd1', notes: [{ id: 1 }] }); } });
  await plan.post('Check this');
  expect(writes[0]).toMatchObject({ position: { line_range: { start: { type: 'new', new_line: 2 }, end: { type: 'new', new_line: 3 } } } });
});

it('turns a non-Error response-body rejection into a readable failure', async () => {
  mockFetch(async () => {
    const response = jsonResponse({});
    vi.spyOn(response, 'text').mockRejectedValue('Unreadable response');
    return response;
  });
  await expect(loadGitLab(ctx)).rejects.toThrow('Unreadable response');
});

it('reads every page of discussions', async () => {
  const discussion = (id: number) => ({ id: `d${id}`, notes: [{ id, body: 'Note', created_at: '2026-10-01', author: { username: 'dana' }, position: { new_path: 'guide.md', old_path: 'guide.md', new_line: 2 } }] });
  gitlab({ '/discussions?': (url) => jsonResponse(url.endsWith('page=1') ? Array.from({ length: 100 }, (_, i) => discussion(i)) : [discussion(100)]) });
  expect(await (await loadGitLab(ctx)).loadThreads!()).toHaveLength(101);
});

it('keeps a reply or comment as a draft and says why when GitLab does not take it', async () => {
  vi.stubGlobal('document', { querySelector: () => ({ content: 'csrf' }) });
  let failure: () => Response = () => jsonResponse({}, 500);
  gitlab({
    '/discussions?': () => jsonResponse([{ id: 'd1', notes: [{ id: 1, body: 'Q', created_at: '2026-10-01', author: { username: 'dana' }, position: { new_path: 'guide.md', old_path: 'guide.md', new_line: 2 } }] }]),
    '/notes': () => failure(),
    '/discussions': (_url, init) => (init?.method === 'POST' ? failure() : jsonResponse([])),
  });
  const source = await loadGitLab(ctx);
  const [thread] = await source.loadThreads!();
  failure = () => { throw new TypeError('offline'); };
  await expect(thread.reply!('Answer')).rejects.toThrow('Could not confirm whether GitLab posted your reply.');
  failure = () => jsonResponse({}, 500);
  await expect(thread.reply!('Answer')).rejects.toThrow('GitLab returned an error (500).');

  const target: CommentTarget = { doc: source.docs[0], side: 'head', startLine: 2, endLine: 2, quote: 'new wording' };
  const plan = await source.prepareComment!(target);
  for (const [answer, message] of [
    [() => jsonResponse({}, 403), 'GitLab did not allow this comment.'],
    [() => { throw new TypeError('offline'); }, 'Could not confirm whether GitLab posted your comment.'],
    [() => jsonResponse({}, 400), 'GitLab could not attach this comment to the selected lines.'],
    [() => jsonResponse({}, 503), 'GitLab returned an error (503).'],
  ] as const) {
    failure = answer;
    await expect(plan.post('Please clarify')).rejects.toThrow(message);
  }
});

it('refuses to post when the merge request moved on while the reviewer was reading', async () => {
  vi.stubGlobal('document', { querySelector: () => ({ content: 'csrf' }) });
  let current = refs;
  gitlab({ 'merge_requests/7': (url) => (url.endsWith('/7') ? jsonResponse({ title: 'Docs', diff_refs: current }) : jsonResponse(url.includes('/diffs?') ? [diff] : [])) });
  const source = await loadGitLab(ctx);
  const plan = await source.prepareComment!({ doc: source.docs[0], side: 'head', startLine: 2, endLine: 2, quote: 'new wording' });
  current = { ...refs, head_sha: 'newer' };
  await expect(plan.post('Please clarify')).rejects.toThrow('This merge request changed while you were reading.');
});
