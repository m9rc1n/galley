import { expect, it } from 'vitest';
import { changeRatio, hasVisibleChange, tokenize, wordDiff } from './worddiff.ts';

it('word diff keeps unchanged words and marks the edit', () => {
  expect(wordDiff('The quick brown fox', 'The quick red fox')).toStrictEqual([
    { type: 'eq', text: 'The quick ' },
    { type: 'del', text: 'brown' },
    { type: 'ins', text: 'red' },
    { type: 'eq', text: ' fox' },
  ]);
});

it('a short unchanged word between two edits is folded into one phrase', () => {
  expect(wordDiff('one a two', 'three a four')).toStrictEqual([
    { type: 'del', text: 'one a two' },
    { type: 'ins', text: 'three a four' },
  ]);
});

it('change ratio and visibility', () => {
  expect(changeRatio(wordDiff('same text', 'same text'))).toBe(0);
  expect(changeRatio(wordDiff('alpha', 'omega'))).toBe(1);
  expect(hasVisibleChange(wordDiff('a  b', 'a b'))).toBe(false);
  expect(hasVisibleChange(wordDiff('a b', 'a c'))).toBe(true);
});

it('tokenizing is lossless, including scripts without spaces', () => {
  for (const s of ['Hello, world! It’s 2026.', '日本語のテキストです。', 'naïve café — déjà vu']) expect(tokenize(s).join('')).toBe(s);
});
