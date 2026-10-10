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
    commands: { onCommand: { addListener: vi.fn() } },
    tabs: { query: vi.fn(async () => []), sendMessage: vi.fn() },
    runtime: { id: EXTENSION_ID, onMessage: { addListener }, onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
    storage: { local: { get: async () => ({}), remove: async () => undefined } },
    permissions: { getAll: vi.fn(async () => ({ origins: ['https://gitlab.com/*', 'https://git.example.com/*'] })) },
    scripting: { getRegisteredContentScripts: vi.fn(async () => []), registerContentScripts: vi.fn(async () => undefined) },
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

it('restores enabled sites when the extension is installed or updated, and when the browser starts', async () => {
  const { runtime, permissions, scripting } = (
    globalThis as unknown as {
      chrome: {
        runtime: Record<'onInstalled' | 'onStartup', { addListener: ReturnType<typeof vi.fn> }>;
        permissions: { getAll: ReturnType<typeof vi.fn> };
        scripting: { registerContentScripts: ReturnType<typeof vi.fn> };
      };
    }
  ).chrome;
  const [[onInstalled]] = runtime.onInstalled.addListener.mock.calls,
    [[onStartup]] = runtime.onStartup.addListener.mock.calls;
  expect(onStartup).toBe(onInstalled);
  onInstalled();
  await vi.waitFor(() => expect(scripting.registerContentScripts).toHaveBeenCalledOnce());
  expect(scripting.registerContentScripts.mock.calls[0][0].map((script: { matches: string[] }) => script.matches)).toEqual([['https://git.example.com/*']]);
  // A failure leaves the site off in the popup, where it can be enabled again; it never surfaces as an error.
  permissions.getAll.mockRejectedValueOnce(new Error('unavailable'));
  expect(() => onStartup()).not.toThrow();
  await vi.waitFor(() => expect(permissions.getAll).toHaveBeenCalledTimes(2));
});

it('leaves messages it does not own to other listeners', () => {
  expect(listener({ type: 'something-else' }, sender(), vi.fn())).toBe(false);
  expect(listener(undefined, sender(), vi.fn())).toBe(false);
});

it('returns a readable reply for unexpected sender and token-store failures', async () => {
  expect(await send({ type: 'galley:has-token' }, sender('not a URL'))).toMatchObject({ error: expect.stringContaining('Invalid URL') });
  const tokens = await import('../platforms/tokens.ts');
  vi.spyOn(tokens, 'getToken').mockRejectedValue('Token store unavailable');
  expect(await send({ type: 'galley:has-token' })).toEqual({ error: 'Token store unavailable' });
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

it('starts even when saved tokens cannot be migrated yet', async () => {
  const get = vi.fn(async () => {
    throw new Error('storage unavailable');
  });
  vi.stubGlobal('chrome', {
    commands: { onCommand: { addListener: vi.fn() } },
    runtime: { id: EXTENSION_ID, onMessage: { addListener: vi.fn() }, onInstalled: { addListener: vi.fn() }, onStartup: { addListener: vi.fn() } },
    storage: { local: { get, remove: async () => undefined } },
  });
  vi.resetModules();
  await import('./worker.ts');
  await vi.waitFor(() => expect(get).toHaveBeenCalledOnce());
  await new Promise((resolve) => setTimeout(resolve, 0));
});

it('opens the current tab only on the reader command, and leaves unavailable tabs alone', async () => {
  const command = vi.mocked(chrome.commands.onCommand.addListener).mock.calls[0][0];
  const query = chrome.tabs.query as unknown as ReturnType<typeof vi.fn>;
  const sendMessage = chrome.tabs.sendMessage as unknown as ReturnType<typeof vi.fn>;
  query.mockResolvedValue([{ id: 7 } as chrome.tabs.Tab]);
  sendMessage.mockResolvedValue({ kind: 'review' });
  command('unrelated');
  expect(query).not.toHaveBeenCalled();
  command('read-page');
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledExactlyOnceWith(7, { type: 'galley:open-reader' }));
  query.mockResolvedValueOnce([]);
  command('read-page');
  await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(2));
  expect(sendMessage).toHaveBeenCalledOnce();
  sendMessage.mockRejectedValueOnce(new Error('No content script'));
  command('read-page');
  await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
});
