import { quietPath } from './quiet.ts';
import type { DocRef } from '../platforms/types.ts';

const pathOf = (doc: DocRef) => (doc.status === 'removed' ? doc.oldPath : doc.path);
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
/** A file's name without its last extension, the way test files name what they test. */
const stem = (path: string) =>
  nameOf(path)
    .replace(/\.[^.]+$/, '')
    .toLowerCase();

/** Test files in the common conventions, with the name of the code they test. */
const TEST_NAMES = [
  /^(.+?)\.(?:test|spec)\.[^.]+$/, // upload.test.ts, Button.spec.tsx
  /^(.+)_test\.(?:go|py|rb|exs?)$/, // limits_test.go, limits_test.py
  /^test_(.+)\.py$/, // test_limits.py
  /^(.+)_spec\.rb$/, // limits_spec.rb
  /^(.+?)Tests?\.(?:java|kt|kts|cs|swift|scala|php)$/, // LimitsTest.java, LimitsTests.cs
];
const TEST_FOLDER = /(?:^|\/)(?:__tests__|tests?|specs?)\//;

/** For a test file, the name of the code it tests (without folder or extension); null for anything else. */
export function testedName(path: string): string | null {
  const name = nameOf(path);
  for (const pattern of TEST_NAMES) {
    const match = pattern.exec(name);
    if (match) return match[1].toLowerCase();
  }
  return TEST_FOLDER.test(path) ? stem(path) : null;
}

/** How many leading folders two paths share: the nearer of two same-named files is the likelier partner. */
function shared(a: string, b: string): number {
  const [x, y] = [a.split('/').slice(0, -1), b.split('/').slice(0, -1)];
  let count = 0;
  while (count < x.length && count < y.length && x[count] === y[count]) count++;
  return count;
}

/**
 * The order a reviewer would read a request in: documents first, then the code, each file followed by
 * its tests, and last the files most reviewers skip (lockfiles, generated or vendored code). Within each
 * part the platform's order stays.
 */
export function readingOrder(docs: DocRef[]): DocRef[] {
  const skippable = docs.filter((doc) => quietPath(doc));
  const rest = docs.filter((doc) => !quietPath(doc));
  const code = rest.filter((doc) => doc.kind === 'code');
  const tests = new Map(code.flatMap((doc) => (testedName(pathOf(doc)) === null ? [] : [[doc, testedName(pathOf(doc))!] as const])));
  const sources = code.filter((doc) => !tests.has(doc));
  const after = new Map<DocRef, DocRef[]>();
  const unpaired: DocRef[] = [];
  for (const [test, subject] of tests) {
    const candidates = sources.filter((doc) => stem(pathOf(doc)) === subject);
    if (!candidates.length) {
      unpaired.push(test);
      continue;
    }
    const partner = candidates.reduce((best, doc) => (shared(pathOf(doc), pathOf(test)) > shared(pathOf(best), pathOf(test)) ? doc : best));
    after.set(partner, [...(after.get(partner) ?? []), test]);
  }
  return [...rest.filter((doc) => doc.kind !== 'code'), ...sources.flatMap((doc) => [doc, ...(after.get(doc) ?? [])]), ...unpaired, ...skippable];
}
