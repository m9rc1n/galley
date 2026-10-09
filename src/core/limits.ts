import { diffArrays, type ArrayChange } from 'diff';

/** Documents longer than this (either version) are not rendered; the platform diff handles them. */
export const MAX_DOCUMENT_CHARS = 2_000_000;

/**
 * Myers diffs take time proportional to size × edits, so a hostile pull request could freeze the
 * page with two long, completely different inputs. Past these limits the differing middle is shown
 * as replaced instead: still correct, just less granular.
 */
const MAX_EDITS = 2_000;
const TIMEOUT_MS = 250;

function part<T>(value: T[], kind: 'same' | 'added' | 'removed'): ArrayChange<T> {
  return { value, count: value.length, added: kind === 'added', removed: kind === 'removed' };
}

/** `diffArrays` with a common prefix and suffix trimmed first and a bounded amount of work. */
export function boundedDiff<T>(a: T[], b: T[]): ArrayChange<T>[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  const midA = a.slice(start, a.length - end);
  const midB = b.slice(start, b.length - end);

  const middle =
    midA.length && midB.length
      ? (diffArrays(midA, midB, { maxEditLength: MAX_EDITS, timeout: TIMEOUT_MS }) ?? [part(midA, 'removed'), part(midB, 'added')])
      : [...(midA.length ? [part(midA, 'removed')] : []), ...(midB.length ? [part(midB, 'added')] : [])];
  return [...(start ? [part(a.slice(0, start), 'same')] : []), ...middle, ...(end ? [part(a.slice(a.length - end), 'same')] : [])];
}
