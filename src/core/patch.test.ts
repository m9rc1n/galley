import { createPatch } from 'diff';
import { expect, it } from 'vitest';
import { reconstructBase } from './patch.ts';

it('the base version is rebuilt from the head and a hunks-only patch', () => {
  const base = 'a\nb\nc\nd\ne\nf\ng\nh\n';
  const head = 'a\nB\nc\nd\ne\nf\ng\nh\ni\n';
  const hunks = createPatch('f.md', base, head).split('\n').slice(4).join('\n');
  expect(hunks.startsWith('@@')).toBeTruthy();
  expect(reconstructBase(head, hunks)).toBe(base);
  expect(reconstructBase('one\ntwo\nthree', '@@ -1,2 +1,3 @@\n one\n-two\n\\ No newline at end of file\n+two\n+three\n\\ No newline at end of file\n')).toBe(
    'one\ntwo',
  );
  expect(reconstructBase('x\n', '@@ -1,1 +1,1 @@\n-a\n+b\n')).toBe(null);
});
