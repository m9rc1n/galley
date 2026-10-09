import { expect, it, vi } from 'vitest';
import { mockFetch } from '../testing/http.ts';
import { loadGitHub } from './github.ts';
import type { GitHubApi } from './github-api.ts';
import { HttpError } from './http.ts';

const ctx = { platform: 'github' as const, key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 1, title: 'Docs' };
const repo = 'https://api.github.com/repos/acme/docs';
const pull = { base: { sha: 'base' }, head: { sha: 'head' } };
const file = (filename: string, status: string, extra: Record<string, unknown> = {}) => ({ filename, status, changes: 1, raw_url: '', ...extra });

/** A GitHub API that answers from a table of handlers, the way the background worker would. */
function github(answer: (url: string, init?: { method?: string; body?: unknown }) => unknown, token = true): GitHubApi {
  return {
    hasToken: async () => token,
    request: vi.fn(async (url: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) => {
      const data = answer(url, init);
      if (data instanceof Error) throw data;
      return { data, headers: new Headers() };
    }) as GitHubApi['request'],
  };
}

it('names each changed file the way the reader shows it, and leaves unchanged files out', async () => {
  const api = github((url) => url.includes('/files?')
    ? [file('new.md', 'added'), file('copy.md', 'copied'), file('gone.md', 'removed'), file('moved.md', 'renamed', { previous_filename: 'old.md' }), file('edited.md', 'modified'), file('same.md', 'unchanged')]
    : pull);
  const source = await loadGitHub(ctx, api);
  expect(source.docs.map((doc) => [doc.path, doc.oldPath, doc.status])).toEqual([
    ['new.md', 'new.md', 'added'], ['copy.md', 'copy.md', 'added'], ['gone.md', 'gone.md', 'removed'], ['moved.md', 'old.md', 'renamed'], ['edited.md', 'edited.md', 'modified'],
  ]);
});

it('reads every page of files and of review comments', async () => {
  const pages: string[] = [];
  const api = github((url) => {
    if (url.includes('/files?')) { pages.push(url); return url.endsWith('page=1') ? Array.from({ length: 100 }, (_, i) => file(`f${i}.md`, 'modified')) : [file('last.md', 'modified')]; }
    if (url.includes('/comments?')) return url.endsWith('page=1') ? Array.from({ length: 100 }, (_, i) => ({ id: i + 1, path: 'last.md', line: 1, side: 'RIGHT', body: 'Hi', user: { login: 'dana' }, created_at: '2026-10-01', html_url: `#c${i}` })) : [];
    return pull;
  });
  const source = await loadGitHub(ctx, api);
  expect(pages).toHaveLength(2);
  expect(source.docs).toHaveLength(101);
  expect(await source.loadThreads!()).toHaveLength(100);
});

it('stops when the pull request changes while it is being loaded', async () => {
  let calls = 0;
  const api = github((url) => (url.includes('/files?') ? [] : (calls++ === 0 ? pull : { ...pull, head: { sha: 'newer' } })));
  await expect(loadGitHub(ctx, api)).rejects.toThrow('This pull request changed while loading.');
});

it('passes on a failure that is not an HTTP error unchanged', async () => {
  await expect(loadGitHub(ctx, github(() => new TypeError('broken')))).rejects.toThrow(TypeError);
  const request = vi.fn().mockRejectedValue('Token store unavailable');
  await expect(loadGitHub(ctx, { hasToken: async () => true, request })).rejects.toThrow('Token store unavailable');
});

it('rebuilds the old version from the patch, and reads it at the merge base when there is none or it does not apply', async () => {
  const compares: string[] = [];
  const api = github((url) => {
    if (url.includes('/compare/')) { compares.push(url); return { merge_base_commit: { sha: 'merge-base' } }; }
    if (url.includes('/files?')) return [
      file('added.md', 'added'),
      file('removed.md', 'removed', { patch: '@@ -1,1 +0,0 @@\n-gone' }),
      file('renamed.md', 'renamed', { previous_filename: 'was.md', changes: 0 }),
      file('large.md', 'modified'),
      file('stale.md', 'modified', { patch: '@@ -1,1 +1,1 @@\n-something else\n+not what the file says' }),
    ];
    return pull;
  });
  const reads: string[] = [];
  mockFetch(async (url) => { reads.push(url); return new Response(url.includes('/merge-base/') ? 'old text' : 'current text'); });
  const source = await loadGitHub(ctx, api);
  const byPath = (path: string) => source.docs.find((doc) => doc.path === path)!;
  expect(await source.load(byPath('added.md'))).toEqual({ base: '', head: 'current text' });
  expect(await source.load(byPath('removed.md'))).toEqual({ base: 'gone\n', head: '' });
  expect(await source.load(byPath('renamed.md'))).toEqual({ base: 'current text', head: 'current text' });
  expect(await source.load(byPath('large.md'))).toEqual({ base: 'old text', head: 'current text' });
  expect(await source.load(byPath('stale.md'))).toEqual({ base: 'old text', head: 'current text' });
  // The merge base is asked for once, however many files need it.
  expect(compares).toEqual([`${repo}/compare/base...head`]);
  expect(reads).toContain('https://github.com/acme/docs/raw/merge-base/large.md');
  expect(reads.some((url) => url.includes('/removed.md'))).toBe(false);
  expect(source.links(byPath('large.md')).raw('docs/a b.md')).toBe('https://github.com/acme/docs/raw/head/docs/a%20b.md');
  expect(source.links(byPath('large.md')).blob('docs/a b.md')).toBe('https://github.com/acme/docs/blob/head/docs/a%20b.md');
});

it('keeps a reply or comment as a draft and says why when GitHub does not take it', async () => {
  let failure: Error = new HttpError(500, '', null);
  const api = github((url, init) => {
    if (init?.method === 'POST') return failure;
    if (url.includes('/files?')) return [file('guide.md', 'modified', { patch: '@@ -1,1 +1,1 @@\n-old\n+new' })];
    if (url.includes('/comments?')) return [{ id: 5, path: 'guide.md', line: 1, side: 'RIGHT', body: 'Q', user: { login: 'dana' }, created_at: '2026-10-01', html_url: '#c5' }];
    return pull;
  });
  mockFetch(async () => new Response('new'));
  const source = await loadGitHub(ctx, api);
  const [thread] = await source.loadThreads!();
  failure = new HttpError(0, '', null);
  await expect(thread.reply!('Answer')).rejects.toThrow('Could not confirm whether GitHub posted your reply.');
  failure = new HttpError(500, '', null);
  await expect(thread.reply!('Answer')).rejects.toThrow('GitHub returned an error (500).');
  const plan = await source.prepareComment!({ doc: source.docs[0], side: 'head', startLine: 1, endLine: 1, quote: 'new' });
  for (const [status, message] of [[422, 'GitHub could not attach this comment to the selected lines.'], [0, 'Could not confirm whether GitHub posted your comment.'], [503, 'GitHub returned an error (503).']] as const) {
    failure = new HttpError(status, '', null);
    await expect(plan.post('Please clarify')).rejects.toThrow(message);
  }
});
