// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { loadViewed, saveViewed, viewedKey } from './viewed.ts';

const doc = { path: 'docs/guide.md', oldPath: 'docs/guide.md', status: 'modified' as const };

afterEach(() => localStorage.clear());

it('local Viewed progress survives reopening, isolates reviews and resets only when the file changes', async () => {
  const contents = { base: 'old private text', head: 'new private text' };
  const key = await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, contents);
  expect(await loadViewed(key)).toBe(false);
  await saveViewed(key, true);
  expect(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', { ...doc }, { ...contents }))).toBe(true);
  expect(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/2', doc, contents))).toBe(false);
  expect(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, { ...contents, head: 'changed again' }))).toBe(false);
  expect(await loadViewed(await viewedKey('https://gitlab.com/a/b/-/merge_requests/1', doc, { ...contents, base: 'new base' }))).toBe(false);
  expect(Object.keys(localStorage).join('')).not.toMatch(/private text/);
  await saveViewed(key, false);
  expect(await loadViewed(key)).toBe(false);
});

it('storage failures reject instead of reporting a saved Viewed flag', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage is full');
  });
  await expect(saveViewed('key', true)).rejects.toThrow(/Storage is full/);
});
