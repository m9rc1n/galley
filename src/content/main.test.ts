import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PageContext, RepoContext } from '../platforms/detect.ts';
import { TOKENS_CHANGED } from '../platforms/token-signal.ts';
import { OPEN_READER, PAGE_STATE } from '../platforms/page-actions.ts';
import type { ReviewSource } from '../platforms/types.ts';
import { deferred } from '../testing/reader.ts';

const mocks = vi.hoisted(() => ({
  detectContext: vi.fn(),
  detectRepository: vi.fn(),
  loadSource: vi.fn(),
  loadRepository: vi.fn(),
  openReader: vi.fn(),
  openRepository: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  reattach: vi.fn(),
}));
vi.mock('../platforms/detect.ts', () => ({ detectContext: mocks.detectContext, detectRepository: mocks.detectRepository }));
vi.mock('../platforms/index.ts', () => ({ loadSource: mocks.loadSource, loadRepository: mocks.loadRepository }));
vi.mock('../ui/reader.ts', () => ({ openReader: mocks.openReader }));
vi.mock('../ui/repo-reader.ts', () => ({ openRepository: mocks.openRepository }));
vi.mock('../ui/launcher.ts', () => ({
  Launcher: class {
    show = mocks.show;
    hide = mocks.hide;
    reattach = mocks.reattach;
  },
}));
let context: PageContext | null;
let repository: RepoContext | null;
let storageChange: (changes: Record<string, unknown>) => void;
let messageListener: (message: unknown, sender: unknown, reply: (response: unknown) => void) => boolean;
const reviewContext = (number: number): PageContext => ({
  platform: 'github',
  key: `github:${number}`,
  origin: 'https://github.com',
  apiBase: 'https://api.github.com',
  owner: 'team',
  repo: 'repo',
  number,
  title: 'Update',
});
const source = (codeOnly = false) =>
  ({ docs: codeOnly ? [] : [{ path: 'guide.md' }], codeDocs: codeOnly ? [{ path: 'main.ts' }] : [] }) as unknown as ReviewSource;
let cleanListeners: Array<() => void>;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  cleanListeners = [];
  delete (window as unknown as Record<string, unknown>).__galleyLoaded;
  history.replaceState(null, '', '/');
  localStorage.clear();
  context = reviewContext(1);
  repository = null;
  mocks.detectContext.mockImplementation(() => context);
  mocks.detectRepository.mockImplementation(() => repository);
  mocks.loadSource.mockResolvedValue(source());
  for (const fn of Object.values(mocks)) fn.mockClear();
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'galley',
      onMessage: {
        addListener: (listener: typeof messageListener) => {
          messageListener = listener;
        },
      },
    },
    storage: {
      onChanged: {
        addListener: (listener: typeof storageChange) => {
          storageChange = listener;
        },
      },
    },
  });
  const documentAdd = document.addEventListener.bind(document);
  const windowAdd = window.addEventListener.bind(window);
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    documentAdd(type, listener, options);
    if (type === 'turbo:load') cleanListeners.push(() => document.removeEventListener(type, listener, options));
  });
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    windowAdd(type, listener, options);
    if (type === 'popstate') cleanListeners.push(() => window.removeEventListener(type, listener, options));
  });
});
afterEach(() => {
  cleanListeners.forEach((cleanup) => {
    cleanup();
  });
  vi.useRealTimers();
  delete (window as unknown as Record<string, unknown>).__galleyLoaded;
});
async function start() {
  await import('./main.ts');
  await vi.advanceTimersByTimeAsync(0);
}
const navigate = () => document.dispatchEvent(new Event('turbo:load'));

it('loads a review once, opens it on click, and reattaches the launcher after same-review navigation', async () => {
  const result = source();
  mocks.loadSource.mockResolvedValue(result);
  await start();
  expect(mocks.show).toHaveBeenCalledWith('github:1', 1, expect.any(Function));
  mocks.show.mock.calls[0][2]();
  expect(mocks.openReader).toHaveBeenCalledWith(result);
  navigate();
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.loadSource).toHaveBeenCalledOnce();
  expect(mocks.reattach).toHaveBeenCalled();
  vi.resetModules();
  await start();
  expect(mocks.loadSource).toHaveBeenCalledOnce();
});

it('ignores a late response from a previous review and removes the launcher off review pages', async () => {
  const pending = deferred<ReviewSource>();
  mocks.loadSource.mockReturnValueOnce(pending.promise);
  await start();
  context = reviewContext(2);
  navigate();
  await Promise.resolve();
  expect(mocks.show).toHaveBeenLastCalledWith('github:2', 1, expect.any(Function));
  const calls = mocks.show.mock.calls.length;
  pending.resolve(source());
  await pending.promise;
  expect(mocks.show).toHaveBeenCalledTimes(calls);
  context = null;
  navigate();
  expect(mocks.hide).toHaveBeenCalled();
});

it('shows code-only reviews, hides empty ones, and polls navigation when SPA events are absent', async () => {
  mocks.loadSource.mockResolvedValueOnce(source(true));
  await start();
  expect(mocks.show).toHaveBeenCalledWith('github:1', 1, expect.any(Function));
  context = reviewContext(2);
  history.replaceState(null, '', '/other');
  mocks.loadSource.mockResolvedValueOnce({ docs: [], codeDocs: [] });
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  expect(mocks.hide).toHaveBeenCalled();
  expect(mocks.show).toHaveBeenCalledOnce();
});

it('shows errors, retries on click, and invalidates a cached source only when credentials change', async () => {
  mocks.loadSource.mockRejectedValueOnce(new Error('No token'));
  await start();
  expect(mocks.show).toHaveBeenCalledWith('github:1', 0, expect.any(Function), true);
  mocks.show.mock.calls[0][2]();
  await Promise.resolve();
  await Promise.resolve();
  expect(mocks.openReader).toHaveBeenCalledWith(expect.any(Promise));
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  storageChange({ unrelated: {} });
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  // Only the non-secret signal counts, and only for this site.
  storageChange({ 'galley:tokens': {} });
  storageChange({ [TOKENS_CHANGED]: { newValue: { origin: 'https://other.example', at: 1 } } });
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  storageChange({ [TOKENS_CHANGED]: { newValue: { origin: location.origin, at: 2 } } });
  await Promise.resolve();
  expect(mocks.loadSource).toHaveBeenCalledTimes(3);
  context = null;
  navigate();
  storageChange({ [TOKENS_CHANGED]: { newValue: { origin: location.origin, at: 3 } } });
  expect(mocks.loadSource).toHaveBeenCalledTimes(3);
});

it('does not replace the current launcher with an error for a review already left', async () => {
  const pending = deferred<ReviewSource>();
  mocks.loadSource.mockReturnValueOnce(pending.promise);
  await start();
  context = null;
  window.dispatchEvent(new PopStateEvent('popstate'));
  pending.reject(new Error('Offline'));
  await pending.promise.catch(() => {});
  expect(mocks.show).not.toHaveBeenCalled();
});

it('keeps the error launcher when the retry fails too, without an unhandled rejection', async () => {
  mocks.loadSource.mockRejectedValue(new Error('No token'));
  await start();
  mocks.show.mock.calls[0][2]();
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.openReader).toHaveBeenCalledOnce();
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  expect(mocks.show).toHaveBeenCalledOnce();
});

it('offers repository pages Read the project without fetching anything until it is chosen', async () => {
  context = null;
  const page = (path: string): RepoContext => ({
    platform: 'github',
    key: `repo:${path}`,
    repository: 'repo:team/repo',
    origin: 'https://github.com',
    apiBase: 'https://api.github.com',
    owner: 'team',
    repo: 'repo',
    view: 'tree',
    rest: ['main', path],
  });
  repository = page('docs');
  const loading = Promise.resolve({ name: 'team/repo' });
  mocks.loadRepository.mockReturnValue(loading);
  await start();
  expect(mocks.show).toHaveBeenCalledExactlyOnceWith('repo:team/repo', null, expect.any(Function));
  expect(mocks.loadRepository).not.toHaveBeenCalled();
  mocks.show.mock.calls[0][2]();
  expect(mocks.loadRepository).toHaveBeenCalledExactlyOnceWith(repository);
  expect(mocks.openRepository).toHaveBeenCalledExactlyOnceWith(loading);
  // Another folder of the same repository is a new starting point, under the same dismissal.
  repository = page('specs');
  navigate();
  expect(mocks.show).toHaveBeenLastCalledWith('repo:team/repo', null, expect.any(Function));
  mocks.show.mock.lastCall![2]();
  expect(mocks.loadRepository).toHaveBeenLastCalledWith(repository);
  expect(mocks.loadSource).not.toHaveBeenCalled();
});

async function message(type: string) {
  const reply = vi.fn();
  expect(messageListener({ type }, { id: 'galley' }, reply)).toBe(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(reply).toHaveBeenCalledOnce();
  return reply.mock.calls[0][0];
}

it('fetches nothing with the button off, names the review without a request, and opens it only on an explicit message', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: false }));
  const write = vi.spyOn(Storage.prototype, 'setItem');
  await start();
  expect(mocks.show).not.toHaveBeenCalled();
  expect(mocks.loadSource).not.toHaveBeenCalled();
  expect(await message(PAGE_STATE)).toEqual({ kind: 'review', label: 'Pull request #1 in team/repo' });
  expect(mocks.loadSource).not.toHaveBeenCalled();
  await message(OPEN_READER);
  expect(mocks.openReader).toHaveBeenCalledWith(expect.any(Promise));
  expect(mocks.loadSource).toHaveBeenCalledOnce();
  expect(write).not.toHaveBeenCalled();
  expect(mocks.show).not.toHaveBeenCalled();
  mocks.loadSource.mockRejectedValueOnce(new Error('Offline'));
  context = reviewContext(2);
  await message(OPEN_READER);
  await message(OPEN_READER);
  expect(mocks.loadSource).toHaveBeenCalledTimes(3);
});

it('ignores foreign, page-originated and unrelated messages, and leaves an unsupported page alone', async () => {
  await start();
  for (const [value, sender] of [
    [{ type: OPEN_READER }, { id: 'other' }],
    [{ type: OPEN_READER }, { id: 'galley', tab: { id: 1 } }],
    [{ type: 'other' }, { id: 'galley' }],
    [undefined, { id: 'galley' }],
  ])
    expect(messageListener(value, sender, vi.fn())).toBe(false);
  context = null;
  expect(await message(OPEN_READER)).toMatchObject({ kind: 'unavailable', label: expect.stringContaining('Open a pull') });
  expect(mocks.openReader).not.toHaveBeenCalled();
});

it('keeps an open reader and draft when the opening choice changes, and ignores late launcher responses', async () => {
  const pending = deferred<ReviewSource>();
  mocks.loadSource.mockReturnValueOnce(pending.promise);
  await start();
  const host = document.createElement('div');
  host.id = 'galley-reader';
  const draft = document.createElement('textarea');
  draft.value = 'Keep this draft';
  host.append(draft);
  document.body.append(host);
  const focus = vi.spyOn(host, 'focus');
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: false }));
  storageChange({ 'galley:settings': { newValue: { readButton: false } } });
  await vi.advanceTimersByTimeAsync(0);
  pending.resolve(source());
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.show).not.toHaveBeenCalled();
  await message(OPEN_READER);
  expect(focus).toHaveBeenCalledOnce();
  expect(mocks.openReader).not.toHaveBeenCalled();
  expect(draft.value).toBe('Keep this draft');
  host.remove();
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: true }));
  storageChange({ 'galley:settings': { newValue: { readButton: true } } });
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.show).toHaveBeenCalledOnce();
  expect(mocks.loadSource).toHaveBeenCalledOnce();
});

it('names nested GitLab reviews and opens repository docs without any eager fetch', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: false }));
  context = {
    platform: 'gitlab',
    key: 'gitlab:7',
    origin: 'https://git.example',
    prefix: '/git',
    projectPath: 'group/subgroup/project',
    projectId: '9',
    iid: 7,
  };
  await start();
  expect(await message(PAGE_STATE)).toEqual({ kind: 'review', label: 'Merge request !7 in group/subgroup/project' });
  context = null;
  repository = {
    platform: 'gitlab',
    key: 'repo:7',
    repository: 'repo:project',
    origin: 'https://git.example',
    prefix: '/git',
    projectPath: 'group/subgroup/project',
    projectId: '9',
    view: 'root',
    rest: [],
  };
  expect(await message(PAGE_STATE)).toEqual({ kind: 'repository', label: 'group/subgroup/project' });
  expect(mocks.loadRepository).not.toHaveBeenCalled();
  await message(OPEN_READER);
  expect(mocks.loadRepository).toHaveBeenCalledWith(repository);
  expect(mocks.openRepository).toHaveBeenCalledOnce();
  expect(mocks.loadSource).not.toHaveBeenCalled();
});

it('waits for a saved opening choice and stays quiet after denied reads', async () => {
  const get = vi.fn(async () => {
    throw new Error('Denied');
  });
  vi.stubGlobal('chrome', { ...chrome, storage: { ...chrome.storage, local: { get } } });
  await start();
  expect(mocks.loadSource).not.toHaveBeenCalled();
  expect(await message(OPEN_READER)).toMatchObject({ kind: 'unavailable', label: expect.stringContaining('could not be read') });
  expect(mocks.openReader).not.toHaveBeenCalled();
  get.mockResolvedValueOnce({} as never);
  storageChange({ 'galley:settings': {} });
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.show).toHaveBeenCalledOnce();
});

it.each(['resolve', 'reject'] as const)('waits for the latest settings read when an older one settles with %s', async (outcome) => {
  const older = deferred<Record<string, unknown>>();
  const latest = deferred<Record<string, unknown>>();
  const get = vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
  vi.stubGlobal('chrome', { ...chrome, storage: { ...chrome.storage, local: { get } } });
  await start();
  const reply = vi.fn();
  messageListener({ type: OPEN_READER }, { id: 'galley' }, reply);
  storageChange({ 'galley:settings': {} });
  if (outcome === 'resolve') older.resolve({});
  else older.reject(new Error('Outdated read failed'));
  await vi.advanceTimersByTimeAsync(0);
  expect(reply).not.toHaveBeenCalled();
  expect(mocks.loadSource).not.toHaveBeenCalled();
  latest.resolve({ 'galley:settings': { readButton: false } });
  await vi.advanceTimersByTimeAsync(0);
  expect(reply).toHaveBeenCalledExactlyOnceWith({ kind: 'review', label: 'Pull request #1 in team/repo' });
  expect(mocks.openReader).toHaveBeenCalledOnce();
  expect(mocks.show).not.toHaveBeenCalled();
});

it('keeps the fresh source after an older load fails during a credential change', async () => {
  const older = deferred<ReviewSource>();
  const latest = deferred<ReviewSource>();
  mocks.loadSource.mockReturnValueOnce(older.promise).mockReturnValueOnce(latest.promise);
  await start();
  storageChange({ [TOKENS_CHANGED]: { newValue: { origin: location.origin, at: 4 } } });
  older.reject(new Error('Old credentials failed'));
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.show).not.toHaveBeenCalled();
  latest.resolve(source());
  await vi.advanceTimersByTimeAsync(0);
  await message(OPEN_READER);
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  expect(mocks.openReader).toHaveBeenCalledWith(latest.promise);
  expect(mocks.show).toHaveBeenCalledOnce();
});

it('focuses an existing reader’s dialog or current editor without replacing either reader', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: false }));
  await start();
  const host = document.createElement('div');
  host.id = 'galley-repo-reader';
  const shadow = host.attachShadow({ mode: 'open' });
  const root = document.createElement('div');
  root.className = 'mr-root';
  root.tabIndex = -1;
  const draft = document.createElement('textarea');
  draft.value = 'Keep this note';
  root.append(draft);
  shadow.append(root);
  document.body.append(host);
  await message(OPEN_READER);
  expect(shadow.activeElement).toBe(root);
  draft.focus();
  await message(OPEN_READER);
  expect(shadow.activeElement).toBe(draft);
  expect(draft.value).toBe('Keep this note');
  expect(mocks.loadSource).not.toHaveBeenCalled();
  expect(mocks.openRepository).not.toHaveBeenCalled();
  host.remove();
});

it('applies a pending opening choice even when credentials change during its read', async () => {
  const pending = deferred<Record<string, unknown>>();
  const get = vi.fn().mockResolvedValueOnce({}).mockReturnValueOnce(pending.promise);
  vi.stubGlobal('chrome', { ...chrome, storage: { ...chrome.storage, local: { get } } });
  await start();
  storageChange({ 'galley:settings': {} });
  storageChange({ [TOKENS_CHANGED]: { newValue: { origin: location.origin, at: 5 } } });
  pending.resolve({ 'galley:settings': { readButton: false } });
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.loadSource).toHaveBeenCalledOnce();
  expect(await message(PAGE_STATE)).toMatchObject({ kind: 'review' });
  await message(OPEN_READER);
  expect(mocks.loadSource).toHaveBeenCalledTimes(2);
  expect(mocks.openReader).toHaveBeenCalledOnce();
});
