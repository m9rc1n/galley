import { expect, it } from 'vitest';
import { reviewChapters } from './chapters.ts';
import { testPartners } from './order.ts';
import type { DocRef } from '../platforms/types.ts';

const code = (path: string): DocRef => ({ path, oldPath: path, status: 'modified', kind: 'code' });
const doc = (path: string): DocRef => ({ path, oldPath: path, status: 'modified' });

it('accounts for every file once, using transparent folders, nearest source/test pairs and supporting files', () => {
  const source = code('packages/server/quota.ts');
  const otherSource = code('packages/client/quota.ts');
  const paired = code('packages/server/tests/quota.test.ts');
  const removed = { ...code('old/quota.test.ts'), status: 'removed' as const, oldPath: 'packages/client/quota.test.ts' };
  const renamed = { ...code('packages/server/new-name.ts'), status: 'renamed' as const, oldPath: 'legacy/name.ts' };
  const unmatched = code('tests/auth.spec.ts');
  const docs = [paired, otherSource, source, doc('docs/rfcs/0042.md'), renamed, removed, unmatched, code('dist/app.min.js'), code('package-lock.json')];
  const image = doc('assets/diagram.png');
  const chapters = reviewChapters(docs, [image]);
  const all = chapters.flatMap((chapter) => chapter.files);
  expect(new Set(all)).toEqual(new Set([...docs, image]));
  expect(all).toHaveLength(docs.length + 1);
  expect(testPartners(docs).get(paired)).toBe(source);
  expect(testPartners(docs).get(removed)).toBe(otherSource);
  expect(chapters.find((chapter) => chapter.id === 'code:packages/server')?.files).toEqual([source, paired, renamed]);
  expect(chapters.find((chapter) => chapter.id === 'code:packages/client')?.files).toEqual([otherSource, removed]);
  expect(chapters.find((chapter) => chapter.id === 'code:tests')?.files).toEqual([unmatched]);
  expect(chapters.find((chapter) => chapter.id === 'supporting')?.files).toHaveLength(2);
  expect(chapters.at(-1)?.files).toEqual([image]);
  expect(chapters.every((chapter) => chapter.reason && chapter.introduction === '')).toBe(true);
});

it('uses factual root labels and keeps documents distinct from code in the same folder', () => {
  const chapters = reviewChapters([doc('README.md'), code('index.ts'), doc('src/guide.md'), code('src/main.ts')]);
  expect(chapters.map((chapter) => chapter.title)).toEqual(['Documents', 'src', 'Root source files', 'src']);
  expect(chapters.map((chapter) => chapter.id)).toEqual(['docs:', 'docs:src', 'code:', 'code:src']);
  expect(reviewChapters([])).toEqual([]);
});
