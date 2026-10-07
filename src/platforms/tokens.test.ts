import { expect, it, vi } from 'vitest';
import { getToken, migrateTokens, setToken } from './tokens.ts';

const GITHUB = 'https://github.com';
const ENTERPRISE = 'https://git.example.com';

it('saves one token per site and removes it again', async () => {
  expect(await getToken(GITHUB)).toBeNull();
  await setToken(GITHUB, 'github_pat_one');
  await setToken(ENTERPRISE, 'github_pat_two');
  expect(await getToken(GITHUB)).toBe('github_pat_one');
  expect(await getToken(ENTERPRISE)).toBe('github_pat_two');
  await setToken(GITHUB, 'github_pat_three');
  expect(await getToken(GITHUB)).toBe('github_pat_three');
  await setToken(GITHUB, null);
  expect(await getToken(GITHUB)).toBeNull();
  expect(await getToken(ENTERPRISE)).toBe('github_pat_two');
});

it('refuses to run inside a web page, whose storage is not private', async () => {
  vi.stubGlobal('location', { protocol: 'https:' });
  await expect(getToken(GITHUB)).rejects.toThrow(/only available to Galley itself/);
  await expect(setToken(GITHUB, 'github_pat_x')).rejects.toThrow(/only available to Galley itself/);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
  await expect(getToken(GITHUB)).resolves.toBeNull();
});

function legacyStorage(initial: Record<string, unknown>) {
  const data = { ...initial };
  const area = {
    get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
    remove: vi.fn(async (key: string) => void delete data[key]),
  };
  vi.stubGlobal('chrome', { storage: { local: area } });
  return area;
}

it('moves tokens saved by older versions out of chrome.storage.local', async () => {
  const area = legacyStorage({ 'galley:tokens': { [GITHUB]: 'github_pat_old', [ENTERPRISE]: 'github_pat_old2' }, 'galley:settings': { theme: 'dark' } });
  await migrateTokens();
  expect(await getToken(GITHUB)).toBe('github_pat_old');
  expect(await getToken(ENTERPRISE)).toBe('github_pat_old2');
  expect(area.remove).toHaveBeenCalledExactlyOnceWith('galley:tokens');
  // Running it again finds nothing left to move.
  await migrateTokens();
  expect(area.remove).toHaveBeenCalledTimes(1);
});

it('never overwrites a token the user has already saved with an old one', async () => {
  await setToken(GITHUB, 'github_pat_new');
  legacyStorage({ 'galley:tokens': { [GITHUB]: 'github_pat_old' } });
  await migrateTokens();
  expect(await getToken(GITHUB)).toBe('github_pat_new');
});

it('does nothing when there is no extension storage', async () => {
  vi.stubGlobal('chrome', undefined);
  await expect(migrateTokens()).resolves.toBeUndefined();
});
