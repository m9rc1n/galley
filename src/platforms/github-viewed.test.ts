import { expect, it, vi } from 'vitest';
import { headersOf, jsonResponse, mockFetch } from '../testing/http.ts';
import { directApi } from './github-api.ts';
import { githubViewed } from './github-viewed.ts';
import { getToken, setToken } from './tokens.ts';
import { HttpError } from './http.ts';

const ctx = { platform: 'github' as const, key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 12, title: 'Docs' };
const doc = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' as const };
const response = jsonResponse;

it('rejects missing pull requests, transport errors, and incomplete pagination without pretending progress is loaded', async () => {
  const request = vi.fn();
  const store = githubViewed(ctx, { request, hasToken: async () => true }, [doc], 'h', 'b');
  request.mockResolvedValue({ data: { data: { repository: null } } });
  await expect(store.load()).rejects.toThrow('could not find');
  request.mockRejectedValue(new HttpError(0, 'offline', null));
  await expect(store.load()).rejects.toThrow('Check GitHub before trying again');
  request.mockRejectedValue(new HttpError(403, 'forbidden', null));
  await expect(store.load()).rejects.toThrow('could not sync');
  request.mockRejectedValue(new Error('Storage unavailable'));
  await expect(store.load()).rejects.toThrow('Storage unavailable');
  request.mockResolvedValue({ data: { data: { repository: { pullRequest: { id: 'id', headRefOid: 'h', baseRefOid: 'b', files: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'cursor' } } } } } } });
  request.mockClear();
  await expect(store.load()).rejects.toThrow('could not load all');
  expect(request).toHaveBeenCalledTimes(10);
});

it('GitHub loads paginated native progress and marks/unmarks with current authentication', async () => {
  await setToken(ctx.origin, 'current-token');
  const calls: Array<{ query: string; variables: { after?: string | null; input?: unknown } }> = [];
  mockFetch(async (url, init) => {
    expect(url).toBe('https://api.github.com/graphql');
    expect(init?.credentials).toBe('omit'); expect(init?.cache).toBe('no-store');
    expect(headersOf(init).Authorization).toBe('Bearer current-token');
    const body = JSON.parse(init!.body as string); calls.push(body);
    if (body.query.startsWith('mutation')) return response({ data: { [body.query.includes('unmark') ? 'unmarkFileAsViewed' : 'markFileAsViewed']: { pullRequest: { id: 'PR_ID' } } } });
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: 'head', baseRefOid: 'base', files: {
      nodes: body.variables.after ? [{ path: 'changed.md', viewerViewedState: 'DISMISSED' }] : [{ path: doc.path, viewerViewedState: 'VIEWED' }, { path: 'other.md', viewerViewedState: 'UNVIEWED' }],
      pageInfo: { hasNextPage: !body.variables.after, endCursor: 'next-page' },
    } } } } });
  });
  const store = githubViewed(ctx, directApi(ctx.origin, getToken), [doc], 'head', 'base');
  expect(await store.load()).toStrictEqual([doc.path]);
  expect(calls[1].variables.after).toBe('next-page');
  await store.set(doc, true); await store.set(doc, false);
  expect(calls[3].query).toMatch(/mutation.*markFileAsViewed/);
  expect(calls[5].query).toMatch(/mutation.*unmarkFileAsViewed/);
  expect(calls[3].variables.input).toStrictEqual({ path: doc.path, pullRequestId: 'PR_ID' });
  await expect(store.set({ ...doc }, true)).rejects.toThrow(/Choose a file/);
  await setToken(ctx.origin, null);
  await expect(store.set(doc, true)).rejects.toThrow(/Add a GitHub token/);
  expect(calls).toHaveLength(6);
});

it('GitHub stale revisions and failed mutations do not record Viewed progress or retry writes', async () => {
  await setToken(ctx.origin, 'token');
  let head = 'head', mutations = 0;
  mockFetch(async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    if (body.query.startsWith('mutation')) { mutations++; return response({ errors: [{ message: 'Permission denied' }] }); }
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: head, baseRefOid: 'base' } } } });
  });
  const store = githubViewed(ctx, directApi(ctx.origin, getToken), [doc], 'head', 'base');
  await expect(store.set(doc, true)).rejects.toThrow(/could not sync/);
  expect(mutations).toBe(1);
  head = 'changed';
  await expect(store.set(doc, true)).rejects.toThrow(/changed while you were reading/);
  expect(mutations).toBe(1);
});

it('GitHub Enterprise Viewed calls use the installation GraphQL endpoint', async () => {
  await setToken('https://git.example.com', 'token');
  mockFetch(async (url) => {
    expect(url).toBe('https://git.example.com/api/graphql');
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: 'h', baseRefOid: 'b', files: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } } });
  });
  const store = githubViewed({ ...ctx, origin: 'https://git.example.com', apiBase: 'https://git.example.com/api/v3' }, directApi('https://git.example.com', getToken), [doc], 'h', 'b');
  expect(await store.load()).toStrictEqual([]);
});
