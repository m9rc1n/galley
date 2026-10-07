import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedRequest, fetchGitHub } from '../src/platforms/github-api.ts';
import { MARK_VIEWED, VIEWED_FILES_QUERY } from '../src/platforms/github-queries.ts';
import { getToken } from '../src/platforms/tokens.ts';

const page = 'https://github.com/acme/docs/pull/12/files';
const api = 'https://api.github.com/repos/acme/docs';
const graphql = (query: string, variables: Record<string, unknown> = { owner: 'acme', repo: 'docs', number: 12 }) => JSON.stringify({ query, variables });

test('the background worker allows exactly the GitHub calls the reader makes', () => {
  const ok = (url: string, method = 'GET', body?: string) => allowedRequest('https://github.com', page, url, method, body);
  assert.ok(ok(`${api}/pulls/12`));
  assert.ok(ok(`${api}/pulls/12/files?per_page=100&page=2`));
  assert.ok(ok(`${api}/pulls/12/comments?per_page=100&page=1`));
  assert.ok(ok(`${api}/compare/aaa...bbb`));
  assert.ok(ok(`${api}/pulls/12/comments`, 'POST', '{}'));
  assert.ok(ok('https://api.github.com/graphql', 'POST', graphql(VIEWED_FILES_QUERY)));
  assert.ok(ok('https://api.github.com/graphql', 'POST', JSON.stringify({ query: MARK_VIEWED, variables: { input: { pullRequestId: 'PR', path: 'a.md' } } })));
});

test('anything else is refused, including other repositories and pull requests', () => {
  const no = (url: string, method = 'GET', body?: string, from = page) => assert.equal(allowedRequest('https://github.com', from, url, method, body), false, `${method} ${url}`);
  no('https://api.github.com/user');
  no('https://api.github.com/user/repos');
  no(`${api}/contents/secret.md`);
  no(`${api}/pulls/12/merge`, 'PUT');
  no(`${api}/pulls/12`, 'PATCH');
  no(`${api}/pulls/12/comments/5`, 'DELETE');
  no(`${api}/issues/12/comments`, 'POST', '{}');
  no('https://api.github.com/repos/other/repo/pulls/12');
  no(`${api}/pulls/13/files`);
  no(`${api}/pulls/13/comments`, 'POST', '{}');
  no('https://api.github.com/graphql', 'POST', graphql('query { viewer { login } }'));
  no('https://api.github.com/graphql', 'POST', graphql(VIEWED_FILES_QUERY, { owner: 'other', repo: 'docs', number: 12 }));
  no('https://api.github.com/graphql', 'GET');
  no('https://evil.example/repos/acme/docs/pulls/12');
  no(`${api}/pulls/12`, 'GET', undefined, 'https://github.com/acme/docs/issues/12');
  // Enterprise: the token's own site only.
  assert.ok(allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://git.example.com/api/v3/repos/acme/docs/pulls/3', 'GET'));
  assert.equal(allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://api.github.com/repos/acme/docs/pulls/3', 'GET'), false);
});

test('tokens are never sent over plain http, and never read from a web page', async (t) => {
  const seen: Array<Record<string, string>> = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, init?: RequestInit) => {
    seen.push(init!.headers as Record<string, string>);
    return new Response('{}');
  });
  await fetchGitHub('http://git.example.com/api/v3/repos/a/b/pulls/1', 'GET', undefined, 'secret');
  await fetchGitHub('https://git.example.com/api/v3/repos/a/b/pulls/1', 'GET', undefined, 'secret');
  assert.equal(seen[0].Authorization, undefined);
  assert.equal(seen[1].Authorization, 'Bearer secret');
  const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { protocol: 'https:' } });
  t.after(() => (location ? Object.defineProperty(globalThis, 'location', location) : Reflect.deleteProperty(globalThis, 'location')));
  await assert.rejects(getToken('https://github.com'), /only available to Galley/);
});
