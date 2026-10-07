import { expect, it } from 'vitest';
import { headersOf, mockFetch } from '../testing/http.ts';
import { allowedRequest, fetchGitHub } from './github-api.ts';
import { MARK_VIEWED, VIEWED_FILES_QUERY } from './github-queries.ts';

const page = 'https://github.com/acme/docs/pull/12/files';
const api = 'https://api.github.com/repos/acme/docs';
const graphql = (query: string, variables: Record<string, unknown> = { owner: 'acme', repo: 'docs', number: 12 }) => JSON.stringify({ query, variables });

it('the background worker allows exactly the GitHub calls the reader makes', () => {
  const ok = (url: string, method = 'GET', body?: string) => allowedRequest('https://github.com', page, url, method, body);
  expect(ok(`${api}/pulls/12`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/files?per_page=100&page=2`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/comments?per_page=100&page=1`)).toBeTruthy();
  expect(ok(`${api}/compare/aaa...bbb`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/comments`, 'POST', '{}')).toBeTruthy();
  expect(ok('https://api.github.com/graphql', 'POST', graphql(VIEWED_FILES_QUERY))).toBeTruthy();
  expect(ok('https://api.github.com/graphql', 'POST', JSON.stringify({ query: MARK_VIEWED, variables: { input: { pullRequestId: 'PR', path: 'a.md' } } }))).toBeTruthy();
});

it('anything else is refused, including other repositories and pull requests', () => {
  const no = (url: string, method = 'GET', body?: string, from = page) => expect(allowedRequest('https://github.com', from, url, method, body), `${method} ${url}`).toBe(false);
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
  expect(allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://git.example.com/api/v3/repos/acme/docs/pulls/3', 'GET')).toBeTruthy();
  expect(allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://api.github.com/repos/acme/docs/pulls/3', 'GET')).toBe(false);
});

it('tokens are only attached to https requests', async () => {
  const seen: Array<Record<string, string>> = [];
  mockFetch((_url, init) => {
    seen.push(headersOf(init));
    return new Response('{}');
  });
  await fetchGitHub('http://git.example.com/api/v3/repos/a/b/pulls/1', 'GET', undefined, 'secret');
  await fetchGitHub('https://git.example.com/api/v3/repos/a/b/pulls/1', 'GET', undefined, 'secret');
  await fetchGitHub('https://api.github.com/repos/a/b/pulls/1', 'GET', undefined, null);
  expect(seen[0].Authorization).toBeUndefined();
  expect(seen[1].Authorization).toBe('Bearer secret');
  expect(seen[2].Authorization).toBeUndefined();
});
