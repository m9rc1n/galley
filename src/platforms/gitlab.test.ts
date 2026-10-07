import { expect, it, vi } from 'vitest';
import { headersOf, jsonResponse, mockFetch } from '../testing/http.ts';
import { loadGitLab } from './gitlab.ts';
import type { CommentTarget } from './types.ts';

const patch = '@@ -1,4 +1,5 @@\n # Guide\n-old wording\n+new wording\n+another line\n context\n end';
const doc = { path: 'new.md', oldPath: 'old.md', status: 'renamed' as const };
const target: CommentTarget = { doc, side: 'head', startLine: 2, endLine: 3, quote: 'new wording\nanother line' };
const response = jsonResponse;

interface GitLabLine {
  new_line?: number;
  old_line?: number;
  line_code?: string;
}

/** The part of a posted GitLab discussion these tests look at. */
interface GitLabWrite {
  body: string;
  position?: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
    old_path: string;
    new_path: string;
    old_line?: number;
    new_line?: number;
    line_range?: { start: GitLabLine; end: GitLabLine };
  };
}

it('GitLab uses the native session, CSRF, shifted context and diff refs for inline comments', async () => {
  vi.stubGlobal('document', { querySelector: () => ({ content: 'session-csrf' }) });
  const writes: GitLabWrite[] = [];
  const refs = { base_sha: 'b', head_sha: 'h', start_sha: 's' };
  mockFetch(async (url, init) => {
    if (init?.method === 'POST') {
      expect(headersOf(init)['X-CSRF-Token']).toBe('session-csrf');
      expect(init.credentials).toBe('same-origin');
      writes.push(JSON.parse(init.body as string));
      return response({ notes: [{ id: 42 }] }, 201);
    }
    if (String(url).includes('/diffs?')) return response([{ new_path: 'new.md', old_path: 'old.md', renamed_file: true, diff: patch }]);
    return response({ title: 'Docs', diff_refs: refs });
  });
  const source = await loadGitLab({ platform: 'gitlab', key: '', origin: 'https://git.example.com', prefix: '/gitlab', projectPath: 'nested/docs', projectId: null, iid: 7 });
  const selected = { ...target, doc: source.docs[0] };
  const inline = await source.prepareComment!(selected);
  expect(inline.kind).toBe('inline');
  expect((await inline.post('Read this')).url).toMatch(/\/gitlab\/nested\/docs\/-\/merge_requests\/7#note_42$/);
  expect({ base: writes[0].position!.base_sha, head: writes[0].position!.head_sha, start: writes[0].position!.start_sha }).toStrictEqual({ base: 'b', head: 'h', start: 's' });
  expect(writes[0].position!.old_line).toBe(undefined);
  expect(writes[0].position!.new_line).toBe(3);
  expect(writes[0].position!.line_range!.start.new_line).toBe(2);
  expect(writes[0].position!.line_range!.start.line_code).toMatch(/_3_2$/);
  expect(writes[0].position!.line_range!.end.line_code).toMatch(/_3_3$/);
  const context = await source.prepareComment!({ ...selected, startLine: 4, endLine: 4 });
  await context.post('Context');
  expect(writes[1].position!.old_line).toBe(3);
  expect(writes[1].position!.new_line).toBe(4);
  const outside = await source.prepareComment!({ ...selected, startLine: 10, endLine: 10 });
  expect(outside.kind).toBe('discussion');
  await outside.post('Outside diff');
  expect(writes[2].position).toBe(undefined);
  expect(writes[2].body).toBe('Outside diff\n\n---\n` new.md ` · new lines 10–10\n\n```\nnew wording\nanother line\n```');
  refs.head_sha = 'changed';
  // Snapshot must stay immutable even when a fixture object changes.
  await expect(inline.post('Stale')).rejects.toThrow(/changed while you were reading/);
  expect(writes).toHaveLength(3);
});

it('GitLab offers source-only reviews and sends old-side source comments with native diff positions', async () => {
  vi.stubGlobal('document', { querySelector: () => ({ content: 'session-csrf' }) });
  const codePatch = '@@ -1 +1 @@\n-old value\n+new value';
  let rawReads = 0;
  const writes: GitLabWrite[] = [];
  mockFetch(async (url, init) => {
    if (init?.method === 'POST') { writes.push(JSON.parse(init.body as string)); return response({ notes: [{ id: 17 }] }, 201); }
    if (String(url).includes('/raw?')) { rawReads++; return new Response(String(url).endsWith('ref=b') ? 'old value\n' : 'new value\n'); }
    if (String(url).includes('/diffs?')) return response([
      { new_path: 'src/main.py', old_path: 'src/main.py', diff: codePatch },
      { new_path: 'photo.jpg', old_path: 'photo.jpg' },
    ]);
    return response({ title: 'Code only', diff_refs: { base_sha: 'b', head_sha: 'h', start_sha: 's' } });
  });
  const source = await loadGitLab({ platform: 'gitlab', key: '', origin: 'https://git.example.com', prefix: '', projectPath: 'a/b', projectId: null, iid: 7 });
  expect(source.docs).toHaveLength(0); expect(source.codeDocs!).toHaveLength(1); expect(rawReads).toBe(0);
  expect(await source.load(source.codeDocs![0])).toStrictEqual({ base: 'old value\n', head: 'new value\n' }); expect(rawReads).toBe(2);
  const plan = await source.prepareComment!({ doc: source.codeDocs![0], side: 'base', startLine: 1, endLine: 1, quote: 'old value' });
  expect(plan.kind).toBe('inline'); await plan.post('Why remove this?');
  expect(writes[0].position!.old_path).toBe('src/main.py'); expect(writes[0].position!.old_line).toBe(1); expect(writes[0].position!.new_line).toBe(undefined);
});

it('GitLab loads diff discussions as threads with links to their notes, leaving out general discussion', async () => {
  const at = '2026-10-01T10:00:00Z';
  mockFetch((url) => {
    if (url.includes('/discussions?')) {
      return response([
        { notes: [{ id: 5, body: 'On the diff', created_at: at, author: { username: 'dana' }, position: { new_path: 'new.md', old_path: 'old.md', new_line: 2 } }] },
        { notes: [{ id: 6, body: 'General remark', created_at: at, author: { username: 'sam' } }] },
      ]);
    }
    if (url.includes('/diffs?')) return response([{ new_path: 'new.md', old_path: 'old.md', renamed_file: true, diff: patch }]);
    return response({ title: 'Docs', diff_refs: { base_sha: 'b', head_sha: 'h', start_sha: 's' } });
  });
  const source = await loadGitLab({ platform: 'gitlab', key: '', origin: 'https://git.example.com', prefix: '/gitlab', projectPath: 'a/b', projectId: null, iid: 7 });
  const threads = await source.loadThreads!();
  expect(threads).toHaveLength(1);
  expect(threads[0]).toMatchObject({ side: 'head', line: 2, url: 'https://git.example.com/gitlab/a/b/-/merge_requests/7#note_5' });
  expect(threads[0].comments[0]).toMatchObject({ author: 'dana', body: 'On the diff' });
});
