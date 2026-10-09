import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const tokens = vi.hoisted(() => ({ getToken: vi.fn(), setToken: vi.fn(), migrateTokens: vi.fn() }));
vi.mock('../platforms/tokens.ts', () => tokens);
const html = readFileSync('src/popup/popup.html', 'utf8');
let saved: string | null;
let granted: boolean;
let registered: boolean;
const api = {
  tabs: { query: vi.fn(), },
  permissions: { contains: vi.fn(), request: vi.fn(), remove: vi.fn() },
  scripting: { getRegisteredContentScripts: vi.fn(), registerContentScripts: vi.fn(), unregisterContentScripts: vi.fn(), executeScript: vi.fn() },
};
const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

beforeEach(() => {
  vi.resetModules();
  document.documentElement.innerHTML = html;
  saved = null; granted = false; registered = false;
  tokens.migrateTokens.mockResolvedValue(undefined);
  tokens.getToken.mockImplementation(async () => saved);
  tokens.setToken.mockImplementation(async (_origin, value) => { saved = value; });
  api.tabs.query.mockResolvedValue([{ id: 7, url: 'https://github.com/team/repo/pull/1' }]);
  api.permissions.contains.mockImplementation(async () => granted);
  api.permissions.request.mockImplementation(async () => { granted = true; return true; });
  api.permissions.remove.mockImplementation(async () => { granted = false; });
  api.scripting.getRegisteredContentScripts.mockImplementation(async () => registered ? [{ id: 'registered' }] : []);
  api.scripting.registerContentScripts.mockImplementation(async () => { registered = true; });
  api.scripting.unregisterContentScripts.mockImplementation(async () => { registered = false; });
  api.scripting.executeScript.mockResolvedValue(undefined);
  for (const group of Object.values(api)) for (const fn of Object.values(group)) fn.mockClear();
  for (const fn of Object.values(tokens)) fn.mockClear();
  vi.stubGlobal('chrome', api);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ installed_version: '3.14' }), { status: 200 })));
});
afterEach(() => document.body.replaceChildren());

async function open(url?: string) {
  if (url !== undefined) api.tabs.query.mockResolvedValue([{ id: 7, url }]);
  await import('./popup.ts');
  await vi.waitFor(() => expect(q('#site').textContent).not.toBe(''));
  await vi.waitFor(() => expect(tokens.getToken.mock.calls.length || q('#token').hidden).toBeTruthy());
}
function submit(value: string) {
  q<HTMLInputElement>('#token-input').value = value;
  q('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

it('keeps a GitHub token out of the input and scopes saving and removal to the displayed site', async () => {
  saved = 'secret'; await open();
  await vi.waitFor(() => expect(q('#token-status').textContent).toContain('A token is saved'));
  expect(q<HTMLInputElement>('#token-input').value).toBe('');
  expect(q('#token-site').textContent).toBe('Galley sends it only to github.com.');
  submit('   '); expect(tokens.setToken).not.toHaveBeenCalled();
  submit('  replacement  ');
  await vi.waitFor(() => expect(tokens.setToken).toHaveBeenCalledWith('https://github.com', 'replacement'));
  expect(fetch).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(q<HTMLInputElement>('#token-input').value).toBe(''));
  q('#token-status button').click();
  await vi.waitFor(() => expect(q('#token-status').textContent).toBe(''));
  expect(tokens.setToken).toHaveBeenLastCalledWith('https://github.com', null);
});

it('shows built-in GitLab support without requesting a GitHub token', async () => {
  await open('https://gitlab.com/team/repo/-/merge_requests/7');
  expect(q('#site').textContent).toContain('Works on gitlab.com out of the box');
  expect(q('#token').hidden).toBe(true);
  expect(tokens.getToken).not.toHaveBeenCalled();
  expect(api.permissions.request).not.toHaveBeenCalled();
});

it.each(['chrome://extensions', 'not a URL'])('handles a non-web tab (%s) without asking for host access', async (url) => {
  await open(url);
  expect(q('#site').textContent).toContain('Open a GitHub or GitLab page');
  expect(api.permissions.contains).not.toHaveBeenCalled();
});

it('requests permission only on a click, registers the exact host, and removes access when disabled', async () => {
  await open('https://git.example/team/repo/-/merge_requests/7');
  expect(api.permissions.request).not.toHaveBeenCalled();
  q('#site button').click();
  await vi.waitFor(() => expect(q('#site').textContent).toContain('Enabled on git.example'));
  expect(api.permissions.request).toHaveBeenCalledExactlyOnceWith({ origins: ['https://git.example/*'] });
  expect(api.scripting.registerContentScripts).toHaveBeenCalledExactlyOnceWith([{ id: 'galley-https-git-example', matches: ['https://git.example/*'], js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true }]);
  expect(api.scripting.executeScript).toHaveBeenCalledExactlyOnceWith({ target: { tabId: 7 }, files: ['content.js'] });
  q('#site button').click();
  await vi.waitFor(() => expect(q('#site button').textContent).toBe('Enable on git.example'));
  expect(api.permissions.remove).toHaveBeenCalledWith({ origins: ['https://git.example/*'] });
});

it('stays usable when the browser refuses to register, inject or unregister the script', async () => {
  api.scripting.registerContentScripts.mockRejectedValueOnce(new Error('duplicate id'));
  api.scripting.executeScript.mockRejectedValueOnce(new Error('tab closed'));
  await open('https://git.example/team/repo/-/merge_requests/7');
  q('#site button').click();
  await vi.waitFor(() => expect(api.scripting.executeScript).toHaveBeenCalledOnce());
  // Nothing was registered, so the site is offered again instead of claiming to be on.
  await vi.waitFor(() => expect(q('#site button').textContent).toBe('Enable on git.example'));
  q('#site button').click();
  await vi.waitFor(() => expect(q('#site').textContent).toContain('Enabled on git.example'));
  api.scripting.unregisterContentScripts.mockRejectedValueOnce(new Error('already gone'));
  q('#site button').click();
  await vi.waitFor(() => expect(q('#site button').textContent).toBe('Enable on git.example'));
  expect(api.permissions.remove).toHaveBeenCalledWith({ origins: ['https://git.example/*'] });
});

it('leaves a site disabled when the browser declines permission', async () => {
  api.permissions.request.mockResolvedValue(false);
  await open('https://git.example/team/repo/pull/7'); q('#site button').click();
  await vi.waitFor(() => expect(api.permissions.request).toHaveBeenCalledOnce());
  expect(api.scripting.registerContentScripts).not.toHaveBeenCalled();
  expect(api.scripting.executeScript).not.toHaveBeenCalled();
});

it('never saves or sends a token to an unverified enterprise host', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}'));
  await open('https://lookalike.example/team/repo/pull/7'); submit('secret');
  await vi.waitFor(() => expect(q('#token-status').textContent).toContain('token was not saved'));
  expect(tokens.setToken).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledExactlyOnceWith('https://lookalike.example/api/v3/meta', { credentials: 'omit', cache: 'no-store' });
  expect(q('#token-site').textContent).toContain('lookalike.example');
  expect(q<HTMLAnchorElement>('#token-link').href).toBe('https://lookalike.example/settings/personal-access-tokens/new');
});

it('saves an enterprise token only after verifying the server, scoped to that exact origin', async () => {
  await open('https://git.example/team/repo/pull/7'); submit('secret');
  await vi.waitFor(() => expect(tokens.setToken).toHaveBeenCalledExactlyOnceWith('https://git.example', 'secret'));
  expect(fetch).toHaveBeenCalledBefore(tokens.setToken);
});

it('treats a failed enterprise probe as unverified', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
  await open('https://git.example/team/repo/pull/7'); submit('secret');
  await vi.waitFor(() => expect(q('#token-status').textContent).toContain('token was not saved'));
  expect(tokens.setToken).not.toHaveBeenCalled();
});

it('disables token saving over HTTP', async () => {
  api.tabs.query.mockResolvedValue([{ id: 7, url: 'http://git.example/team/repo/pull/7' }]);
  await import('./popup.ts');
  await vi.waitFor(() => expect(q<HTMLInputElement>('#token-input').disabled).toBe(true));
  expect(q<HTMLInputElement>('#token-input').disabled).toBe(true);
  expect(q<HTMLButtonElement>('#token-form button').disabled).toBe(true);
});

it('offers guidance when there is no current tab and can enable a site without an injectable tab id', async () => {
  api.tabs.query.mockResolvedValue([]); await open();
  expect(q('#site').textContent).toContain('Open a GitHub or GitLab page');
  vi.resetModules(); document.documentElement.innerHTML = html;
  api.tabs.query.mockResolvedValue([{ url: 'https://git.example/team/repo/pull/7' }]);
  await open(); q('#site button').click();
  await vi.waitFor(() => expect(q('#site').textContent).toContain('Enabled on git.example'));
  expect(api.scripting.executeScript).not.toHaveBeenCalled();
});
