import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../background/worker.ts', () => ({}));
const api = {
  scripting: { getRegisteredContentScripts: vi.fn(), registerContentScripts: vi.fn(), unregisterContentScripts: vi.fn() },
  tabs: { query: vi.fn(), reload: vi.fn() },
  alarms: { create: vi.fn(), onAlarm: { addListener: vi.fn() } },
};
let scripts: chrome.scripting.RegisteredContentScript[];
let sockets: FakeSocket[];
class FakeSocket {
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) { sockets.push(this); }
}

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); sockets = []; scripts = [];
  vi.stubGlobal('chrome', api); vi.stubGlobal('WebSocket', FakeSocket);
  api.scripting.getRegisteredContentScripts.mockImplementation(async (filter?: { ids: string[] }) => filter ? scripts.filter((s) => filter.ids.includes(s.id)) : [...scripts]);
  api.scripting.registerContentScripts.mockImplementation(async (added: typeof scripts) => { scripts.push(...added); });
  api.scripting.unregisterContentScripts.mockImplementation(async ({ ids }: { ids: string[] }) => { scripts = scripts.filter((s) => !ids.includes(s.id)); });
  api.tabs.query.mockResolvedValue([{ id: 7 }, {}]); api.tabs.reload.mockResolvedValue(undefined);
  api.alarms.create.mockResolvedValue(undefined);
  for (const fn of Object.values(api.scripting)) fn.mockClear();
  for (const fn of Object.values(api.tabs)) fn.mockClear();
  api.alarms.create.mockClear(); api.alarms.onAlarm.addListener.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());
async function start() { await import('./reload.ts'); await vi.advanceTimersByTimeAsync(0); }

it('registers the development script, removes the old registration and connects only to the local server', async () => {
  scripts = [{ id: 'mreadie-dev-main', matches: ['https://github.com/*'], js: ['content.js'] }]; await start();
  expect(scripts.map((s) => s.id)).toEqual(['galley-dev-main']);
  expect(sockets).toHaveLength(1); expect(sockets[0].url).toBe('ws://localhost:35729');
  expect(api.alarms.create).toHaveBeenCalledWith('galley-dev-reconnect', { periodInMinutes: 0.5 });
  sockets[0].onopen!(); expect(console.log).toHaveBeenCalledWith(expect.stringContaining('live reload on'));
});

it('preserves custom-site registrations on rebuild and reloads only matching active tabs', async () => {
  scripts = [{ id: 'galley-dev-main', matches: ['https://github.com/*'], js: ['content.js'] }, { id: 'custom', matches: ['https://git.example/*'], excludeMatches: ['https://git.example/admin/*'], css: [], allFrames: false, runAt: 'document_idle', persistAcrossSessions: true }];
  await start(); expect(api.scripting.registerContentScripts).not.toHaveBeenCalled();
  sockets[0].onmessage!({ data: 'ignored' }); await vi.advanceTimersByTimeAsync(0);
  expect(api.tabs.reload).not.toHaveBeenCalled();
  sockets[0].onmessage!({ data: 'content' }); await vi.advanceTimersByTimeAsync(0);
  expect(api.scripting.unregisterContentScripts).toHaveBeenLastCalledWith({ ids: ['galley-dev-main', 'custom'] });
  expect(scripts[1]).toMatchObject({ id: 'custom', matches: ['https://git.example/*'], excludeMatches: ['https://git.example/admin/*'], js: ['content.js'], persistAcrossSessions: true });
  expect(api.tabs.query).toHaveBeenCalledWith({ active: true, url: ['https://github.com/*', 'https://git.example/*'] });
  expect(api.tabs.reload).toHaveBeenCalledExactlyOnceWith(7);
});

it('reconnects after a closed socket without duplicating a connecting or open socket', async () => {
  await start(); const reconnect = api.alarms.onAlarm.addListener.mock.calls[0][0];
  reconnect(); expect(sockets).toHaveLength(1);
  sockets[0].readyState = 1; reconnect(); expect(sockets).toHaveLength(1);
  sockets[0].onclose!(); await vi.advanceTimersByTimeAsync(1999); expect(sockets).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1); expect(sockets).toHaveLength(2);
});

it('reports registration and rebuild failures without leaving unhandled rejections', async () => {
  api.scripting.registerContentScripts.mockRejectedValue(new Error('Unavailable')); await start();
  expect(console.error).toHaveBeenCalledWith('Galley dev: could not register the content script', expect.any(Error));
  sockets[0].onmessage!({ data: 'content' }); await vi.advanceTimersByTimeAsync(0);
  expect(console.error).toHaveBeenCalledWith('Galley dev: update failed', expect.any(Error));
  expect(api.tabs.reload).not.toHaveBeenCalled();
});

it('reloads a single active tab and tolerates registrations without URL matches', async () => {
  scripts = [{ id: 'galley-dev-main', matches: ['https://github.com/*'], js: ['content.js'] }, { id: 'custom', js: ['content.js'] }];
  api.tabs.query.mockResolvedValue([{ id: 7 }]);
  await start(); sockets[0].onmessage!({ data: 'content' }); await vi.advanceTimersByTimeAsync(0);
  expect(api.tabs.query).toHaveBeenCalledWith({ active: true, url: ['https://github.com/*'] });
  expect(console.log).toHaveBeenCalledWith('Galley dev: content script updated, refreshed 1 tab');
});
