import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PageContext, RepoContext } from '../platforms/detect.ts';
import { TOKENS_CHANGED } from '../platforms/token-signal.ts';
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
  context = reviewContext(1);
  repository = null;
  mocks.detectContext.mockImplementation(() => context);
  mocks.detectRepository.mockImplementation(() => repository);
  mocks.loadSource.mockResolvedValue(source());
  for (const fn of Object.values(mocks)) fn.mockClear();
  vi.stubGlobal('chrome', {
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
  await Promise.resolve();
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

it('offers repository pages Read docs without fetching anything until it is chosen', async () => {
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
