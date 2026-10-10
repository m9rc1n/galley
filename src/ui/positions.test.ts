import { beforeEach, expect, it, vi } from 'vitest';
import { loadPosition, savePosition } from './positions.ts';

beforeEach(() => localStorage.clear());

it('remembers where the reader was in each review, for the 50 most recent reviews', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1);
  expect(await loadPosition('first', ['src/limits.ts'])).toBeNull();
  await savePosition('first', 'src/limits.ts', 120);
  expect(await loadPosition('first', ['docs/guide.md', 'src/limits.ts'])).toEqual({ path: 'src/limits.ts', offset: 120 });
  // A file no longer in the review is no place to return to.
  expect(await loadPosition('first', ['docs/guide.md'])).toBeNull();
  for (let i = 0; i < 50; i++) {
    now.mockReturnValue(100 + i);
    await savePosition(`review ${i}`, 'docs/guide.md', i);
  }
  expect(await loadPosition('first', ['src/limits.ts'])).toBeNull();
  expect(await loadPosition('review 49', ['docs/guide.md'])).toEqual({ path: 'docs/guide.md', offset: 49 });
  now.mockRestore();
});

it('keeps fingerprints, never the review address or file path', async () => {
  await savePosition('https://github.com/acme/secret/pull/7/files', 'src/secret-plan.ts', 10);
  const stored = localStorage.getItem('galley:positions')!;
  expect(stored).not.toContain('secret');
  expect(stored).toMatch(/^\{"[0-9a-f]{64}":\{"file":"[0-9a-f]{64}","offset":10,"at":\d+\}\}$/);
});

it('ignores anything else found under its key', async () => {
  await savePosition('review', 'a.md', 0);
  const key = Object.keys(JSON.parse(localStorage.getItem('galley:positions')!))[0];
  for (const value of ['"text"', '[1, 2]', `{"${key}": {"file": 7, "offset": 1}}`, `{"${key}": {"file": "a", "offset": "far"}}`]) {
    localStorage.setItem('galley:positions', value);
    expect(await loadPosition('review', ['a.md']), value).toBeNull();
  }
  localStorage.setItem('galley:positions', '"text"');
  await savePosition('review', 'a.md', 0);
  expect(await loadPosition('review', ['a.md'])).toEqual({ path: 'a.md', offset: 0 });
});
