import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mockFetch } from '../testing/http.ts';
import { loadGitHub } from './github.ts';
import type { GitHubApi } from './github-api.ts';
import { HttpError } from './http.ts';

const ctx = { platform: 'github' as const, key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 1, title: 'Docs' };
const pull = { base: { sha: 'base' }, head: { sha: 'head' } };
const file = (filename = 'guide.md') => ({ filename, status: 'modified', changes: 1, raw_url: '', patch: '@@ -1 +1 @@\n-old\n+new' });
const api = (answer: (url: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) => unknown = (url) => url.includes('/files?') ? [file()] : pull): GitHubApi => ({
  hasToken: async () => true,
  request: vi.fn(async (url: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) => {
    const data = answer(url, init);
    if (data instanceof Error) throw data;
    return { data, headers: new Headers() };
  }) as GitHubApi['request'],
});

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout'] }));
afterEach(() => vi.useRealTimers());

/** Attach a rejection handler before advancing the backoff timers. */
async function finish<T>(work: Promise<T>): Promise<T> {
  const handled = work.then((value) => ({ value }), (error: unknown) => ({ error }));
  await vi.runAllTimersAsync();
  const result = await handled;
  if ('error' in result) throw result.error;
  return result.value;
}

it.each([408, 500, 502, 503, 504])('recovers a raw file after a temporary HTTP %i without changing its reviewed revision', async (status) => {
  let calls = 0;
  const fetch = mockFetch(() => ++calls === 1 ? new Response('', { status }) : new Response('new\n'));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [url, init] of fetch.mock.calls) {
    expect(url).toBe('https://github.com/acme/docs/raw/head/guide.md');
    expect(init).toEqual({ credentials: 'same-origin', cache: 'no-store' });
  }
});

it('recovers a raw file when the connection fails once', async () => {
  const fetch = mockFetch(() => new Response('new\n'));
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('retries a connection lost while consuming the raw response body', async () => {
  const broken = new Response('partial'); vi.spyOn(broken, 'text').mockRejectedValue(new TypeError('terminated'));
  let calls = 0;
  const fetch = mockFetch(() => ++calls === 1 ? broken : new Response('new\n'));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('backs off twice and stops after three attempts for a persistent raw-file error', async () => {
  const fetch = mockFetch(() => new Response('', { status: 503 }));
  const source = await loadGitHub(ctx, api());
  const failure = expect(source.load(source.docs[0])).rejects.toMatchObject({ status: 503 });
  await vi.advanceTimersByTimeAsync(249); expect(fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(749); expect(fetch).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1); await failure;
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([400, 401, 403, 404, 422, 429, 501])('does not repeatedly download a file refused with HTTP %i', async (status) => {
  const fetch = mockFetch(() => new Response('', { status }));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).rejects.toMatchObject({ status });
  expect(fetch).toHaveBeenCalledOnce();
});

it.each([403, 429, 503])('waits for a short Retry-After cooldown on HTTP %i', async (status) => {
  let reads = 0;
  const fetch = mockFetch(() => ++reads === 1 ? new Response('', { status, headers: { 'retry-after': '1' } }) : new Response('new\n'));
  const source = await loadGitHub(ctx, api());
  const loaded = expect(source.load(source.docs[0])).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  await vi.advanceTimersByTimeAsync(999); expect(fetch).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1); await loaded;
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each(['5', '-1', 'not a duration', 'Wed, 21 Oct 2099 07:28:00 GMT'])('does not retry early or keep waiting on an unsupported cooldown: %s', async (cooldown) => {
  const fetch = mockFetch(() => new Response('', { status: 503, headers: { 'retry-after': cooldown } }));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).rejects.toMatchObject({ status: 503 });
  expect(fetch).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
});

it.each([
  [403, { 'x-ratelimit-remaining': '0' }],
  [429, { 'x-ratelimit-remaining': '0' }],
  [403, { 'x-github-sso': 'required' }],
])('preserves quota and SSO failures even when HTTP %i also gives a short cooldown', async (status, headers) => {
  const fetch = mockFetch(() => new Response('', { status, headers: { 'retry-after': '1', ...headers } }));
  const source = await loadGitHub(ctx, api());
  await expect(finish(source.load(source.docs[0]))).rejects.toMatchObject({ status });
  expect(fetch).toHaveBeenCalledOnce();
});

it('retries only the failed API file page and keeps the revision check after all pages load', async () => {
  let second = 0;
  const github = api((url) => {
    if (url.includes('/files?')) {
      if (url.endsWith('page=1')) return Array.from({ length: 100 }, (_, i) => file(`${i}.md`));
      return ++second === 1 ? new HttpError(502, url, null) : [file('last.md')];
    }
    return pull;
  });
  const source = await finish(loadGitHub(ctx, github));
  expect(source.docs).toHaveLength(101);
  expect(source.docs.at(-1)?.path).toBe('last.md');
  expect(vi.mocked(github.request).mock.calls.map(([url]) => url)).toEqual([
    'https://api.github.com/repos/acme/docs/pulls/1',
    'https://api.github.com/repos/acme/docs/pulls/1/files?per_page=100&page=1',
    'https://api.github.com/repos/acme/docs/pulls/1/files?per_page=100&page=2',
    'https://api.github.com/repos/acme/docs/pulls/1/files?per_page=100&page=2',
    'https://api.github.com/repos/acme/docs/pulls/1',
  ]);
});

it('retries an interrupted metadata request, and still rejects a pull request that changes during loading', async () => {
  let metadata = 0;
  const github = api((url) => {
    if (url.includes('/files?')) return [file()];
    if (++metadata === 1) return new HttpError(0, url, null);
    return metadata === 2 ? pull : { ...pull, head: { sha: 'new-head' } };
  });
  await expect(finish(loadGitHub(ctx, github))).rejects.toThrow('This pull request changed while loading.');
  expect(metadata).toBe(3);
});

it('retries the old raw version of a removed file without downloading a head version', async () => {
  const github = api((url) => url.includes('/files?') ? [{ ...file(), status: 'removed', patch: undefined }] : url.includes('/compare/') ? { merge_base_commit: { sha: 'merge-base' } } : pull);
  let reads = 0;
  const fetch = mockFetch(() => ++reads === 1 ? new Response('', { status: 502 }) : new Response('old\n'));
  const source = await loadGitHub(ctx, github);
  await expect(finish(source.load(source.docs[0]))).resolves.toEqual({ base: 'old\n', head: '' });
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(Array(2).fill('https://github.com/acme/docs/raw/merge-base/guide.md'));
});

it('never retries a comment write whose server response is temporarily unavailable', async () => {
  let writes = 0;
  const github = api((url, init) => {
    if (init?.method === 'POST') { writes++; return new HttpError(503, url, null); }
    return url.includes('/files?') ? [file()] : pull;
  });
  const source = await loadGitHub(ctx, github);
  const plan = await source.prepareComment!({ doc: source.docs[0], side: 'head', startLine: 1, endLine: 1, quote: 'new' });
  await expect(finish(plan.post('Please explain'))).rejects.toThrow('GitHub returned an error (503).');
  expect(writes).toBe(1); expect(vi.getTimerCount()).toBe(0);
});

it('allows a manual file retry after a shared merge-base lookup exhausts its transient retries', async () => {
  let compares = 0;
  const github = api((url) => {
    if (url.includes('/files?')) return ['first.md', 'second.md'].map((filename) => ({ ...file(filename), patch: undefined }));
    if (url.includes('/compare/')) return ++compares <= 3 ? new HttpError(503, url, null) : { merge_base_commit: { sha: 'merge-base' } };
    return pull;
  });
  mockFetch((url) => new Response(url.includes('/merge-base/') ? 'old\n' : 'new\n'));
  const source = await loadGitHub(ctx, github);
  await expect(finish(Promise.all(source.docs.map((doc) => source.load(doc))))).rejects.toMatchObject({ message: 'GitHub returned an error (503).' });
  expect(compares).toBe(3);
  await expect(finish(source.load(source.docs[0]))).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  expect(compares).toBe(4);
  await expect(finish(source.load(source.docs[1]))).resolves.toEqual({ base: 'old\n', head: 'new\n' });
  expect(compares).toBe(4);
});
