import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { githubViewed } from '../src/platforms/github-viewed.ts';
import { viewedKey, loadViewed, saveViewed } from '../src/ui/viewed.ts';
import { setToken } from '../src/ui/settings.ts';

const ctx = { platform: 'github' as const, key: '', origin: 'https://github.com', apiBase: 'https://api.github.com', owner: 'acme', repo: 'docs', number: 12, title: 'Docs' };
const doc = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' as const };
const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
function storage(t: TestContext) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  return values;
}

test('local Viewed progress survives reopening, isolates reviews and resets only when the file changes', async (t) => {
  const values = storage(t), contents = { base: 'old private text', head: 'new private text' };
  const key = await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, contents);
  assert.equal(await loadViewed(key), false);
  await saveViewed(key, true);
  assert.equal(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', { ...doc }, { ...contents })), true);
  assert.equal(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/2', doc, contents)), false);
  assert.equal(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, { ...contents, head: 'changed again' })), false);
  assert.equal(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, { ...contents, base: 'new base' })), false);
  assert.doesNotMatch([...values.keys()].join(''), /private text/);
  await saveViewed(key, false);
  assert.equal(await loadViewed(key), false);
});

test('storage failures reject instead of reporting a saved Viewed flag', async (t) => {
  storage(t);
  t.mock.method(localStorage, 'setItem', () => { throw new Error('Storage is full'); });
  await assert.rejects(saveViewed('key', true), /Storage is full/);
});

test('GitHub loads paginated native progress and marks/unmarks with current authentication', async (t) => {
  storage(t); await setToken(ctx.origin, 'current-token');
  const calls: Array<{ query: string; variables: any }> = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    assert.equal(url, 'https://api.github.com/graphql');
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.cache, 'no-store');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer current-token');
    const body = JSON.parse(init!.body as string); calls.push(body);
    if (body.query.startsWith('mutation')) return response({ data: { [body.query.includes('unmark') ? 'unmarkFileAsViewed' : 'markFileAsViewed']: { pullRequest: { id: 'PR_ID' } } } });
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: 'head', baseRefOid: 'base', files: {
      nodes: body.variables.after ? [{ path: 'changed.md', viewerViewedState: 'DISMISSED' }] : [{ path: doc.path, viewerViewedState: 'VIEWED' }, { path: 'other.md', viewerViewedState: 'UNVIEWED' }],
      pageInfo: { hasNextPage: !body.variables.after, endCursor: 'next-page' },
    } } } } });
  });
  const store = githubViewed(ctx, [doc], 'head', 'base');
  assert.deepEqual(await store.load(), [doc.path]);
  assert.equal(calls[1].variables.after, 'next-page');
  await store.set(doc, true); await store.set(doc, false);
  assert.match(calls[3].query, /mutation.*markFileAsViewed/);
  assert.match(calls[5].query, /mutation.*unmarkFileAsViewed/);
  assert.deepEqual(calls[3].variables.input, { path: doc.path, pullRequestId: 'PR_ID' });
  await assert.rejects(store.set({ ...doc }, true), /Choose a file/);
  await setToken(ctx.origin, null);
  await assert.rejects(store.set(doc, true), /Add a GitHub token/);
  assert.equal(calls.length, 6);
});

test('GitHub stale revisions and failed mutations do not record Viewed progress or retry writes', async (t) => {
  storage(t); await setToken(ctx.origin, 'token');
  let head = 'head', mutations = 0;
  t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string);
    if (body.query.startsWith('mutation')) { mutations++; return response({ errors: [{ message: 'Permission denied' }] }); }
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: head, baseRefOid: 'base' } } } });
  });
  const store = githubViewed(ctx, [doc], 'head', 'base');
  await assert.rejects(store.set(doc, true), /could not sync/);
  assert.equal(mutations, 1);
  head = 'changed';
  await assert.rejects(store.set(doc, true), /changed while you were reading/);
  assert.equal(mutations, 1);
});

test('GitHub Enterprise Viewed calls use the installation GraphQL endpoint', async (t) => {
  storage(t); await setToken('https://git.example.com', 'token');
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'https://git.example.com/api/graphql');
    return response({ data: { repository: { pullRequest: { id: 'PR_ID', headRefOid: 'h', baseRefOid: 'b', files: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } } });
  });
  const store = githubViewed({ ...ctx, origin: 'https://git.example.com', apiBase: 'https://git.example.com/api/v3' }, [doc], 'h', 'b');
  assert.deepEqual(await store.load(), []);
});
