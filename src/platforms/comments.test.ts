import { expect, it } from 'vitest';
import { commentContext, diffLines, diffRange, githubThreads, gitlabThreads } from './comments.ts';
import MarkdownIt from 'markdown-it';
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

it('GitLab participants appear by their display name; the username is kept for mentions', () => {
  const doc = { path: 'README.md', oldPath: 'README.md', status: 'modified' as const };
  const at = '2026-10-01T10:00:00Z';
  const position = { new_path: 'README.md', old_path: 'README.md', new_line: 7, old_line: 7 };
  const [thread] = gitlabThreads([doc], [{ notes: [
    { id: 1, body: 'Hi', created_at: at, author: { username: 'dana', name: 'Dana Whitfield' }, position },
    { id: 2, body: 'Blank name', created_at: at, author: { username: 'lee', name: '  ' } },
    { id: 3, body: 'Deleted account', created_at: at, author: null },
  ] }], (id) => `#note_${id}`);
  expect(thread.comments.map(({ author, handle }) => ({ author, handle }))).toStrictEqual([
    { author: 'Dana Whitfield', handle: 'dana' },
    { author: 'lee', handle: 'lee' },
    { author: 'unknown', handle: undefined },
  ]);
});

it('pull request text in a posted comment stays code: no mentions, references, links or images', () => {
  const md = new MarkdownIt({ linkify: true });
  const hostile = {
    doc: { path: 'docs/`@team` ![x](https://t.example/p.gif).md', oldPath: 'old\n@dana.md', status: 'renamed' as const },
    side: 'head' as const, startLine: 4, endLine: 9,
    quote: 'Thanks @org/security-team, see #1\n````\n![pixel](https://tracker.example/p.gif) [ok](https://evil.example)\n```',
  };
  const body = commentContext(hostile, '  Looks good @reviewer  ');
  expect(body.startsWith('Looks good @reviewer\n\n---\n')).toBe(true);
  const html = md.render(body);
  // The reviewer's own text is untouched; everything after the rule is inside <code>.
  const [, context] = html.split('<hr>');
  expect(context).not.toMatch(/<img|<a /);
  const outside = context.replace(/<code>[\s\S]*?<\/code>/g, '');
  expect(outside).not.toMatch(/@|#1|https?:/);
  expect(context).toContain('<code>docs/`@team` ![x](https://t.example/p.gif).md</code>');
  expect(context).toContain('Thanks @org/security-team, see #1\n````\n![pixel]');
  expect(commentContext({ ...hostile, side: 'base' }, 'x')).toContain('` old @dana.md ` · old lines 4–9');
});

it('long quotes are cut, and empty quotes add only the location', () => {
  const long = commentContext({ ...target, quote: 'word '.repeat(400) }, 'Body');
  expect(long).toMatch(/\n(`{3})\n(word ){200}…\n\1$/);
  expect(long.length).toBeLessThan(1_100);
  expect(commentContext({ ...target, quote: '' }, 'Body')).toBe('Body\n\n---\n` new.md ` · new lines 2–3');
  expect(commentContext({ ...target, quote: 'a\r\nb\n\n' }, 'Body')).toMatch(/\n```\na\nb\n```$/);
});
