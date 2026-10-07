import { expect, it } from 'vitest';
import { boundedDiff } from './limits.ts';

/** The old and new sequence each change object describes, so a diff can be checked without caring how it is grouped. */
function replay(parts: ReturnType<typeof boundedDiff<string>>) {
  const before: string[] = [];
  const after: string[] = [];
  for (const part of parts) {
    if (!part.added) before.push(...part.value);
    if (!part.removed) after.push(...part.value);
  }
  return { before, after };
}

const numbered = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

it('finds the small edit between two similar sequences', () => {
  const a = ['one', 'two', 'three', 'four'];
  const b = ['one', 'two', 'THREE', 'four'];
  const parts = boundedDiff(a, b);
  expect(replay(parts)).toStrictEqual({ before: a, after: b });
  expect(parts.filter((p) => p.added || p.removed).map((p) => p.value)).toStrictEqual([['three'], ['THREE']]);
});

it('handles empty inputs and identical inputs', () => {
  expect(boundedDiff([], [])).toStrictEqual([]);
  expect(replay(boundedDiff([], ['a']))).toStrictEqual({ before: [], after: ['a'] });
  expect(replay(boundedDiff(['a'], []))).toStrictEqual({ before: ['a'], after: [] });
  expect(boundedDiff(['a', 'b'], ['a', 'b'])).toHaveLength(1);
});

it('gives up on a hopeless diff quickly, and still describes both sides exactly', () => {
  const a = numbered('a', 40_000);
  const b = numbered('b', 40_000);
  const started = performance.now();
  const parts = boundedDiff(a, b);
  expect(performance.now() - started).toBeLessThan(2_000);
  // Nothing matches, so the whole of both sides is shown as replaced.
  expect(replay(parts)).toStrictEqual({ before: a, after: b });
});

it('keeps the shared start and end when only the middle is hopeless', () => {
  const middleA = numbered('a', 30_000);
  const middleB = numbered('b', 30_000);
  const parts = boundedDiff(['start', ...middleA, 'end'], ['start', ...middleB, 'end']);
  expect(parts[0]).toMatchObject({ value: ['start'], added: false, removed: false });
  expect(parts.at(-1)).toMatchObject({ value: ['end'], added: false, removed: false });
});
