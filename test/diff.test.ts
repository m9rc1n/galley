import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createPatch } from 'diff';
import { diffUnits, similarity, summarize } from '../src/core/blockdiff.ts';
import { parseDocument } from '../src/core/markdown.ts';
import { reconstructBase } from '../src/core/patch.ts';
import { changeRatio, hasVisibleChange, tokenize, wordDiff } from '../src/core/worddiff.ts';

const kinds = (base: string, head: string) => diffUnits(parseDocument(base).units, parseDocument(head).units).map((c) => c.kind);

test('re-wrapping a paragraph is not a change', () => {
  assert.deepEqual(kinds('One two three\nfour five.\n', 'One two\nthree four five.\n'), ['same']);
});

test('an edited paragraph is paired with its old version', () => {
  assert.deepEqual(kinds('# T\n\nThe quick brown fox jumps.\n\nEnd.\n', '# T\n\nThe quick red fox jumps high.\n\nEnd.\n'), ['same', 'modified', 'same']);
});

test('unrelated blocks are removed and added, in reading order', () => {
  assert.deepEqual(kinds('A first paragraph.\n\nShared ending.\n', 'Completely different words here.\n\nShared ending.\n'), ['removed', 'added', 'same']);
});

test('a new list item is an addition between unchanged ones', () => {
  assert.deepEqual(kinds('- alpha\n- beta\n', '- alpha\n- gamma ray\n- beta\n'), ['same', 'added', 'same']);
});

test('headings only pair with headings', () => {
  assert.deepEqual(kinds('## Rollout plan\n', 'Rollout plan\n'), ['removed', 'added']);
});

test('similarity is a word-overlap score', () => {
  assert.equal(similarity('a b c', 'c b a'), 1);
  assert.equal(similarity('alpha beta', 'gamma delta'), 0);
  assert.equal(similarity('one two three four', 'one two five six'), 0.5);
});

test('the sample RFC diff finds the edits a reviewer would expect', () => {
  const read = (side: string) => readFileSync(new URL(`../demo/samples/${side}/docs/rfcs/0042-reading-first-reviews.md`, import.meta.url), 'utf8');
  const changes = diffUnits(parseDocument(read('base')).units, parseDocument(read('head')).units);
  const find = (kind: string, text: string) => changes.find((c) => c.kind === kind && (c.head ?? c.base)!.text.includes(text));
  assert.ok(find('modified', 'onboarding guides'), 'edited first paragraph');
  assert.ok(find('modified', 'diffUnits'), 'edited code block');
  assert.ok(find('modified', 'status: In review'), 'edited front matter');
  assert.ok(find('removed', 'Alternatives considered'), 'removed section heading');
  assert.ok(find('removed', 'AsciiDoc'), 'removed list item');
  assert.ok(find('added', 'Commenting on a selected sentence'), 'new task list item');
  assert.ok(find('added', '[!NOTE]'), 'new alert');
  assert.ok(find('same', 'Building a new comment system'), 'unchanged list item');
  const s = summarize(changes);
  assert.ok(s.modified >= 8 && s.added >= 8 && s.removed >= 2, JSON.stringify(s));
});

test('word diff keeps unchanged words and marks the edit', () => {
  assert.deepEqual(wordDiff('The quick brown fox', 'The quick red fox'), [
    { type: 'eq', text: 'The quick ' },
    { type: 'del', text: 'brown' },
    { type: 'ins', text: 'red' },
    { type: 'eq', text: ' fox' },
  ]);
});

test('a short unchanged word between two edits is folded into one phrase', () => {
  assert.deepEqual(wordDiff('one a two', 'three a four'), [
    { type: 'del', text: 'one a two' },
    { type: 'ins', text: 'three a four' },
  ]);
});

test('change ratio and visibility', () => {
  assert.equal(changeRatio(wordDiff('same text', 'same text')), 0);
  assert.equal(changeRatio(wordDiff('alpha', 'omega')), 1);
  assert.equal(hasVisibleChange(wordDiff('a  b', 'a b')), false);
  assert.equal(hasVisibleChange(wordDiff('a b', 'a c')), true);
});

test('tokenizing is lossless, including scripts without spaces', () => {
  for (const s of ['Hello, world! It’s 2026.', '日本語のテキストです。', 'naïve café — déjà vu']) assert.equal(tokenize(s).join(''), s);
});

test('the base version is rebuilt from the head and a hunks-only patch', () => {
  const base = 'a\nb\nc\nd\ne\nf\ng\nh\n';
  const head = 'a\nB\nc\nd\ne\nf\ng\nh\ni\n';
  const hunks = createPatch('f.md', base, head).split('\n').slice(4).join('\n');
  assert.ok(hunks.startsWith('@@'));
  assert.equal(reconstructBase(head, hunks), base);
  assert.equal(reconstructBase('one\ntwo\nthree', '@@ -1,2 +1,3 @@\n one\n-two\n\\ No newline at end of file\n+two\n+three\n\\ No newline at end of file\n'), 'one\ntwo');
  assert.equal(reconstructBase('x\n', '@@ -1,1 +1,1 @@\n-a\n+b\n'), null);
});
