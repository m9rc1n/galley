import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { diffUnits, similarity, summarize } from './blockdiff.ts';
import { parseDocument } from './markdown.ts';

const kinds = (base: string, head: string) => diffUnits(parseDocument(base).units, parseDocument(head).units).map((c) => c.kind);

it('re-wrapping a paragraph is not a change', () => {
  expect(kinds('One two three\nfour five.\n', 'One two\nthree four five.\n')).toStrictEqual(['same']);
});

it('an edited paragraph is paired with its old version', () => {
  expect(kinds('# T\n\nThe quick brown fox jumps.\n\nEnd.\n', '# T\n\nThe quick red fox jumps high.\n\nEnd.\n')).toStrictEqual(['same', 'modified', 'same']);
});

it('unrelated blocks are removed and added, in reading order', () => {
  expect(kinds('A first paragraph.\n\nShared ending.\n', 'Completely different words here.\n\nShared ending.\n')).toStrictEqual(['removed', 'added', 'same']);
});

it('a new list item is an addition between unchanged ones', () => {
  expect(kinds('- alpha\n- beta\n', '- alpha\n- gamma ray\n- beta\n')).toStrictEqual(['same', 'added', 'same']);
});

it('headings only pair with headings', () => {
  expect(kinds('## Rollout plan\n', 'Rollout plan\n')).toStrictEqual(['removed', 'added']);
});

it('similarity is a word-overlap score', () => {
  expect(similarity('a b c', 'c b a')).toBe(1);
  expect(similarity('alpha beta', 'gamma delta')).toBe(0);
  expect(similarity('one two three four', 'one two five six')).toBe(0.5);
});

it('the sample RFC diff finds the edits a reviewer would expect', () => {
  const read = (side: string) => readFileSync(new URL(`../../demo/samples/${side}/docs/rfcs/0042-reading-first-reviews.md`, import.meta.url), 'utf8');
  const changes = diffUnits(parseDocument(read('base')).units, parseDocument(read('head')).units);
  const find = (kind: string, text: string) => changes.find((c) => c.kind === kind && (c.head ?? c.base)!.text.includes(text));
  expect(find('modified', 'onboarding guides'), 'edited first paragraph').toBeTruthy();
  expect(find('modified', 'diffUnits'), 'edited code block').toBeTruthy();
  expect(find('modified', 'status: In review'), 'edited front matter').toBeTruthy();
  expect(find('removed', 'Alternatives considered'), 'removed section heading').toBeTruthy();
  expect(find('removed', 'AsciiDoc'), 'removed list item').toBeTruthy();
  expect(find('added', 'Commenting on a selected sentence'), 'new task list item').toBeTruthy();
  expect(find('added', '[!NOTE]'), 'new alert').toBeTruthy();
  expect(find('same', 'Building a new comment system'), 'unchanged list item').toBeTruthy();
  const s = summarize(changes);
  expect(s.modified >= 8 && s.added >= 8 && s.removed >= 2, JSON.stringify(s)).toBeTruthy();
});
