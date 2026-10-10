import { expect, it } from 'vitest';
import { readingOrder, testedName } from './order.ts';
import type { DocRef } from '../platforms/types.ts';

const code = (path: string, status: DocRef['status'] = 'modified'): DocRef => ({ path, oldPath: path, status, kind: 'code' });
const doc = (path: string): DocRef => ({ path, oldPath: path, status: 'modified' });
const paths = (docs: DocRef[]) => docs.map((item) => item.path);

it('knows a test file by its name or folder, and what it tests', () => {
  expect(testedName('src/upload.test.ts')).toBe('upload');
  expect(testedName('src/ui/Button.spec.tsx')).toBe('button');
  expect(testedName('limits/limits_test.go')).toBe('limits');
  expect(testedName('app/limits_test.py')).toBe('limits');
  expect(testedName('tests/test_limits.py')).toBe('limits');
  expect(testedName('spec/limits_spec.rb')).toBe('limits');
  expect(testedName('src/test/java/LimitsTest.java')).toBe('limits');
  expect(testedName('Limits.Tests/LimitsTests.cs')).toBe('limits');
  expect(testedName('src/__tests__/upload.ts')).toBe('upload');
  expect(testedName('src/upload.ts')).toBeNull();
  expect(testedName('src/latest.ts')).toBeNull();
});

it('reads documents first, then each source file with its tests, then the files most reviewers skip', () => {
  const docs = [
    code('package-lock.json'),
    code('src/limits/quota.test.ts'),
    code('src/limits/quota.ts'),
    doc('docs/limits.md'),
    code('src/other/quota.ts'),
    code('src/review.ts'),
    code('tests/test_unrelated.py'),
    code('src/__tests__/review.ts'),
    code('dist/limits.min.js'),
    code('src/limits/quota.spec.ts'),
  ];
  expect(paths(readingOrder(docs))).toEqual([
    'docs/limits.md',
    'src/limits/quota.ts',
    'src/limits/quota.test.ts',
    'src/limits/quota.spec.ts',
    'src/other/quota.ts',
    'src/review.ts',
    'src/__tests__/review.ts',
    'tests/test_unrelated.py',
    'package-lock.json',
    'dist/limits.min.js',
  ]);
  // A removed test still pairs with its code, by its old path.
  const removed: DocRef = { path: 'src/upload.test.ts', oldPath: 'src/upload.test.ts', status: 'removed', kind: 'code' };
  expect(paths(readingOrder([removed, code('src/upload.ts')]))).toEqual(['src/upload.ts', 'src/upload.test.ts']);
  // Of two files with the tested name, the one in the test's own folder is its partner, whichever comes first.
  expect(paths(readingOrder([code('a/quota.ts'), code('b/quota.ts'), code('b/quota.test.ts')]))).toEqual(['a/quota.ts', 'b/quota.ts', 'b/quota.test.ts']);
  expect(readingOrder([])).toEqual([]);
});
