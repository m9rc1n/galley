import { beforeEach, expect, it, vi } from 'vitest';
import { headersOf, jsonResponse, mockFetch } from '../testing/http.ts';
import { setToken } from '../platforms/tokens.ts';

type Listener = (message: unknown, sender: unknown, reply: (response: unknown) => void) => boolean;

const EXTENSION_ID = 'galley-extension-id';
const PULL = 'https://github.com/acme/docs/pull/12/files';
const FILES = 'https://api.github.com/repos/acme/docs/pulls/12/files?per_page=100&page=1';
const sender = (url = PULL, overrides: Record<string, unknown> = {}) => ({ id: EXTENSION_ID, tab: { id: 1 }, url, ...overrides });

let listener: Listener;

/** Load the worker fresh, with a stubbed chrome API, and capture the message listener it registers. */
beforeEach(async () => {
  const addListener = vi.fn();
  vi.stubGlobal('chrome', {
    runtime: { id: EXTENSION_ID, onMessage: { addListener } },
    storage: { local: { get: async () => ({}), remove: async () => undefined } },
  });
  vi.resetModules();
  await import('./worker.ts');
  listener = addListener.mock.calls[0][0] as Listener;
});

/** Send a message the way the browser would, and wait for the worker's answer. */
async function send(message: unknown, from: unknown = sender()): Promise<unknown> {
  const reply = vi.fn();
  expect(listener(message, from, reply)).toBe(true);
  await vi.waitFor(() => expect(reply).toHaveBeenCalledTimes(1));
  return reply.mock.calls[0][0];
}

const request = (url: string, method = 'GET', body?: string) => ({ type: 'galley:github', url, method, ...(body === undefined ? {} : { body }) });

it('leaves messages it does not own to other listeners', () => {
  expect(listener({ type: 'something-else' }, sender(), vi.fn())).toBe(false);
  expect(listener(undefined, sender(), vi.fn())).toBe(false);
});

it('only answers Galley’s own content scripts in a tab', async () => {
  const fetchSpy = mockFetch(() => jsonResponse([]));
  await setToken('https://github.com', 'github_pat_secret');
  for (const from of [sender(PULL, { id: 'another-extension' }), sender(PULL, { tab: undefined }), sender(PULL, { url: undefined })]) {
    expect(await send(request(FILES), from)).toStrictEqual({ error: 'Refused.' });
    expect(await send({ type: 'galley:has-token' }, from)).toStrictEqual({ error: 'Refused.' });
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('reports a token only for the site the message really came from', async () => {
  await setToken('https://github.com', 'github_pat_one');
  expect(await send({ type: 'galley:has-token' })).toStrictEqual({ has: true });
  expect(await send({ type: 'galley:has-token' }, sender('https://git.example.com/acme/docs/pull/1'))).toStrictEqual({ has: false });
  // A saved token is never used for a page that is not served over https.
  await setToken('http://github.test', 'github_pat_plain');
  expect(await send({ type: 'galley:has-token' }, sender('http://github.test/acme/docs/pull/1'))).toStrictEqual({ has: false });
});

it('refuses requests the reader never makes, without contacting GitHub', async () => {
  const fetchSpy = mockFetch(() => jsonResponse({}));
  await setToken('https://github.com', 'github_pat_secret');
  for (const message of [
    request('https://api.github.com/user'),
    request('https://api.github.com/repos/other/repo/pulls/12/files'),
    request('https://api.github.com/repos/acme/docs/pulls/12/merge', 'PUT'),
    request('https://evil.example/repos/acme/docs/pulls/12/files'),
    request('https://api.github.com/graphql', 'POST', JSON.stringify({ query: 'query { viewer { login } }' })),
  ]) {
    expect(await send(message)).toStrictEqual({ error: 'Galley does not make this request.' });
  }
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('sends an allowed request with the token of that site and returns only the headers the reader needs', async () => {
  await setToken('https://github.com', 'github_pat_secret');
  await setToken('https://git.example.com', 'github_pat_other_site');
  const fetchSpy = mockFetch(
    () =>
      new Response('[{"filename":"a.md"}]', {
        status: 200,
        headers: { link: '<next>; rel="next"', 'x-ratelimit-remaining': '59', 'set-cookie': 'session=1', 'x-github-request-id': 'abc' },
      }),
  );
  expect(await send(request(FILES))).toStrictEqual({
    status: 200,
    body: '[{"filename":"a.md"}]',
    headers: { link: '<next>; rel="next"', 'x-ratelimit-remaining': '59' },
  });
  const init = fetchSpy.mock.calls[0][1];
  expect(headersOf(init).Authorization).toBe('Bearer github_pat_secret');
  expect(init?.credentials).toBe('omit');
});

it('reads public repositories without a token, and passes error statuses through', async () => {
  const fetchSpy = mockFetch(() => jsonResponse({ message: 'Not Found' }, 404));
  expect(await send(request(FILES))).toMatchObject({ status: 404 });
  expect(headersOf(fetchSpy.mock.calls[0][1]).Authorization).toBeUndefined();
});

it('reports a network failure as status 0', async () => {
  mockFetch(() => {
    throw new TypeError('Failed to fetch');
  });
  expect(await send(request(FILES))).toStrictEqual({ status: 0, body: '', headers: {} });
});
