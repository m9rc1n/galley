import { expect, it, vi } from 'vitest';
import { headersOf, mockFetch } from '../testing/http.ts';
import { allowedRequest, backgroundApi, directApi, fetchGitHub } from './github-api.ts';
import { HttpError } from './http.ts';
import { MARK_VIEWED, VIEWED_FILES_QUERY } from './github-queries.ts';

const page = 'https://github.com/acme/docs/pull/12/files';
const api = 'https://api.github.com/repos/acme/docs';
const graphql = (query: string, variables: Record<string, unknown> = { owner: 'acme', repo: 'docs', number: 12 }) => JSON.stringify({ query, variables });

it('the direct API refuses an unsupported endpoint before reading a token or making a request', async () => {
  const tokenFor = vi.fn(),
    fetch = mockFetch(() => new Response('{}'));
  await expect(directApi('https://github.com', tokenFor).request('https://api.github.com/user')).rejects.toThrow('Galley does not make this request');
  expect(tokenFor).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('the background worker allows exactly the GitHub calls the reader makes', () => {
  const ok = (url: string, method = 'GET', body?: string) => allowedRequest('https://github.com', page, url, method, body);
  expect(ok(`${api}/pulls/12`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/files?per_page=100&page=2`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/comments?per_page=100&page=1`)).toBeTruthy();
  expect(ok(`${api}/compare/aaa...bbb`)).toBeTruthy();
  expect(ok(`${api}/pulls/12/comments`, 'POST', '{}')).toBeTruthy();
  expect(ok('https://api.github.com/graphql', 'POST', graphql(VIEWED_FILES_QUERY))).toBeTruthy();
  expect(
    ok('https://api.github.com/graphql', 'POST', JSON.stringify({ query: MARK_VIEWED, variables: { input: { pullRequestId: 'PR', path: 'a.md' } } })),
  ).toBeTruthy();
});

it('anything else is refused, including other repositories and pull requests', () => {
  const no = (url: string, method = 'GET', body?: string, from = page) =>
    expect(allowedRequest('https://github.com', from, url, method, body), `${method} ${url}`).toBe(false);
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
  expect(
    allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://git.example.com/api/v3/repos/acme/docs/pulls/3', 'GET'),
  ).toBeTruthy();
  expect(allowedRequest('https://git.example.com', 'https://git.example.com/acme/docs/pull/3', 'https://api.github.com/repos/acme/docs/pulls/3', 'GET')).toBe(
    false,
  );
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

it('refuses malformed requests: an unparsable URL, a GraphQL body that is not JSON, a bare repository and a badly encoded owner', () => {
  const allowed = (url: string, method = 'GET', body?: string) => allowedRequest('https://github.com', page, url, method, body);
  expect(allowed('not a url')).toBe(false);
  expect(allowed('https://api.github.com/graphql', 'POST', '{not json')).toBe(false);
  expect(allowed('https://api.github.com/repos/acme', 'GET')).toBe(false);
  expect(allowed('https://api.github.com/repos/%E0%A4%A/docs/pulls/12')).toBe(false);
  // A known query without variables cannot point at another repository.
  expect(allowed('https://api.github.com/graphql', 'POST', JSON.stringify({ query: VIEWED_FILES_QUERY }))).toBe(true);
});

it('content scripts reach GitHub only through the background worker, which answers with status, body and headers', async () => {
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  const worker = backgroundApi();
  sendMessage.mockResolvedValueOnce({ has: true });
  expect(await worker.hasToken()).toBe(true);
  expect(sendMessage).toHaveBeenLastCalledWith({ type: 'galley:has-token' });
  sendMessage.mockResolvedValueOnce({ status: 201, body: '{"id":5}', headers: { 'x-ratelimit-remaining': '42' } });
  const posted = await worker.request<{ id: number }>(`${api}/pulls/12/comments`, { method: 'POST', body: { body: 'Hi' } });
  expect(posted.data).toEqual({ id: 5 });
  expect(posted.headers.get('x-ratelimit-remaining')).toBe('42');
  expect(sendMessage).toHaveBeenLastCalledWith({ type: 'galley:github', url: `${api}/pulls/12/comments`, method: 'POST', body: '{"body":"Hi"}' });
  sendMessage.mockResolvedValueOnce({ status: 404, body: '{}', headers: {} });
  await expect(worker.request(`${api}/pulls/12`)).rejects.toMatchObject({ status: 404 });
});

it('treats a refusal or a missing background worker as GitHub being unreachable', async () => {
  const sendMessage = vi.fn();
  vi.stubGlobal('chrome', { runtime: { sendMessage } });
  const worker = backgroundApi();
  sendMessage.mockResolvedValueOnce({ error: 'Galley does not make this request.' });
  await expect(worker.request(`${api}/contents/secret.md`)).rejects.toEqual(new HttpError(0, `${api}/contents/secret.md`, null));
  sendMessage.mockRejectedValue(new Error('Extension context invalidated.'));
  expect(await worker.hasToken()).toBe(false);
  await expect(worker.request(`${api}/pulls/12`)).rejects.toMatchObject({ status: 0 });
});
