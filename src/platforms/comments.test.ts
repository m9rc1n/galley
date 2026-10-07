import { expect, it } from 'vitest';
import { diffLines, diffRange, githubThreads, gitlabThreads } from './comments.ts';
import type { CommentTarget } from './types.ts';

const patch = '@@ -1,4 +1,5 @@\n # Guide\n-old wording\n+new wording\n+another line\n context\n end';
const doc = { path: 'new.md', oldPath: 'old.md', status: 'renamed' as const };
const target: CommentTarget = { doc, side: 'head', startLine: 2, endLine: 3, quote: 'new wording\nanother line' };

it('diff coordinates distinguish additions, deletions, shifted context and separate hunks', () => {
  expect(diffLines(patch).map(({ oldLine, newLine }) => [oldLine, newLine])).toStrictEqual([[1,1], [2,undefined], [undefined,2], [undefined,3], [3,4], [4,5]]);
  expect(diffRange(patch, target)?.length).toBe(2);
  expect(diffRange(patch, { ...target, startLine: 1, endLine: 8 })).toBe(null);
  expect(diffRange('@@ -1 +1 @@\n one\n@@ -2 +2 @@\n two', { ...target, startLine: 1, endLine: 2 })).toBe(null);
});

it('GitHub review comments become threads anchored to a version and line', () => {
  const doc = { path: 'docs/a.md', oldPath: 'docs/old.md', status: 'renamed' as const };
  const at = '2026-10-01T10:00:00Z';
  const threads = githubThreads([doc], [
    { id: 3, in_reply_to_id: 1, path: 'docs/a.md', line: 12, side: 'RIGHT', body: 'Reply', user: { login: 'lee' }, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r3' },
    { id: 1, path: 'docs/a.md', line: 12, side: 'RIGHT', body: 'Root', user: { login: 'dana' }, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r1' },
    { id: 2, path: 'docs/old.md', line: 4, side: 'LEFT', body: 'Old side', user: null, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r2' },
    { id: 4, path: 'docs/a.md', line: null, side: 'RIGHT', body: 'Outdated', user: { login: 'sam' }, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r4' },
    { id: 5, path: 'docs/a.md', subject_type: 'file', body: 'Whole file', user: { login: 'kim' }, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r5' },
    { id: 6, path: 'src/other.ts', line: 1, side: 'RIGHT', body: 'Elsewhere', user: { login: 'x' }, created_at: at, html_url: 'https://github.com/o/r/pull/1#discussion_r6' },
  ]);
  expect(threads.map((t) => [t.side, t.line, Boolean(t.outdated), t.comments.map((c) => `${c.author}: ${c.body}`)])).toStrictEqual([
    ['head', 12, false, ['dana: Root', 'lee: Reply']],
    ['base', 4, false, ['ghost: Old side']],
    ['head', null, true, ['sam: Outdated']],
    ['head', null, false, ['kim: Whole file']],
  ]);
});

it('GitLab diff discussions become threads; system notes and general discussions are left out', () => {
  const doc = { path: 'README.md', oldPath: 'README.md', status: 'modified' as const };
  const at = '2026-10-01T10:00:00Z';
  const threads = gitlabThreads([doc], [
    { notes: [{ id: 10, body: 'Nice', created_at: at, author: { username: 'dana' }, resolved: true, position: { new_path: 'README.md', old_path: 'README.md', new_line: 7, old_line: 7 } }, { id: 11, body: 'changed the description', system: true, created_at: at }, { id: 12, body: 'Thanks', created_at: at, author: { username: 'lee' } }] },
    { notes: [{ id: 20, body: 'Removed line?', created_at: at, author: { username: 'sam' }, position: { new_path: 'README.md', old_path: 'README.md', new_line: null, old_line: 3 } }] },
    { notes: [{ id: 30, body: 'General comment', created_at: at, author: { username: 'kim' } }] },
  ], (id) => `https://gitlab.example/g/p/-/merge_requests/1#note_${id}`);
  expect(threads.map((t) => [t.side, t.line, t.resolved, t.url, t.comments.map((c) => c.author)])).toStrictEqual([
    ['head', 7, true, 'https://gitlab.example/g/p/-/merge_requests/1#note_10', ['dana', 'lee']],
    ['base', 3, false, 'https://gitlab.example/g/p/-/merge_requests/1#note_20', ['sam']],
  ]);
});
