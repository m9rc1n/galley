import { commentContext, diffRange, requireBody, validateTarget } from './comments.ts';
import { encodePath, isMarkdownPath, isCodePath } from '../core/paths.ts';
import type { GitLabContext } from './detect.ts';
import { getJson, getText, HttpError } from './http.ts';
import { ReaderError, type DocRef, type DocStatus, type ReviewSource } from './types.ts';

interface MergeRequest {
  title: string;
  diff_refs: { base_sha: string; head_sha: string; start_sha: string } | null;
}

interface GitLabDiff {
  old_path: string;
  new_path: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff?: string;
}

const MAX_PAGES = 20;

function explain(err: unknown): Error {
  if (!(err instanceof HttpError)) return err instanceof Error ? err : new Error(String(err));
  if (err.status === 401 || err.status === 403 || err.status === 404) {
    return new ReaderError('GitLab did not return this merge request.', 'Make sure you are signed in and can see this project.');
  }
  if (err.status === 429) return new ReaderError('GitLab rate limit reached.', 'Wait a minute and try again.');
  if (err.status === 0) return new ReaderError('Could not reach GitLab.', 'Check your connection and try again.');
  return new ReaderError(`GitLab returned an error (${err.status}).`, 'Try again in a moment.');
}

function status(d: GitLabDiff): DocStatus {
  if (d.new_file) return 'added';
  if (d.deleted_file) return 'removed';
  if (d.renamed_file) return 'renamed';
  return 'modified';
}

/** GitLab's REST API accepts the browser session cookie, so no token is needed. */
export async function loadGitLab(ctx: GitLabContext): Promise<ReviewSource> {
  const api = `${ctx.origin}${ctx.prefix}/api/v4/projects/${ctx.projectId ?? encodeURIComponent(ctx.projectPath)}`;
  const json = async <T>(url: string) => {
    try {
      return await getJson<T>(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    } catch (err) {
      throw explain(err);
    }
  };

  const { data: mr } = await json<MergeRequest>(`${api}/merge_requests/${ctx.iid}`);
  const refs = mr.diff_refs;
  if (!refs?.head_sha) throw new ReaderError('GitLab is still preparing the diff of this merge request.', 'Try again in a moment.');

  const diffs: GitLabDiff[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, headers } = await getJson<GitLabDiff[]>(`${api}/merge_requests/${ctx.iid}/diffs?per_page=100&page=${page}`);
      diffs.push(...data);
      if (!headers.get('x-next-page')) break;
    }
  } catch (err) {
    // GitLab < 15.7 has no /diffs endpoint; fall back to the older /changes.
    if (!(err instanceof HttpError) || err.status !== 404) throw explain(err);
    const { data } = await json<{ changes: GitLabDiff[] }>(`${api}/merge_requests/${ctx.iid}/changes`);
    diffs.push(...data.changes);
  }

  const raw = (path: string, sha: string) =>
    getText(`${api}/repository/files/${encodeURIComponent(path)}/raw?ref=${sha}`).catch((err) => {
      throw explain(err);
    });
  const webBase = `${ctx.origin}${ctx.prefix}/${ctx.projectPath}`;

  const all: DocRef[] = diffs
    .filter((d) => isMarkdownPath(d.new_path) || isMarkdownPath(d.old_path) || isCodePath(d.new_path) || isCodePath(d.old_path))
    .map((d) => ({ path: d.new_path, oldPath: d.old_path, status: status(d), ...(!(isMarkdownPath(d.new_path) || isMarkdownPath(d.old_path)) ? { kind: 'code' as const } : {}) }));
  const docs = all.filter((doc) => doc.kind !== 'code');
  const codeDocs = all.filter((doc) => doc.kind === 'code');

  return {
    title: mr.title,
    subtitle: `${ctx.projectPath} · !${ctx.iid}`,
    diffUrl: `${webBase}/-/merge_requests/${ctx.iid}/diffs`,
    docs,
    codeDocs,
    async load(doc) {
      // base_sha is the merge base: exactly what GitLab's own diff compares against.
      const [base, head] = await Promise.all([
        doc.status === 'added' ? '' : raw(doc.oldPath, refs.base_sha),
        doc.status === 'removed' ? '' : raw(doc.path, refs.head_sha),
      ]);
      return { base, head };
    },
    async prepareComment(target) {
      validateTarget(all, target);
      const diff = diffs.find((d) => d.new_path === target.doc.path && d.old_path === target.doc.oldPath);
      const range = diffRange(diff?.diff, target);
      let position: Record<string, unknown> | undefined;
      if (range) {
        const endpoint = (row: typeof range[number]) => ({
          ...(row.oldLine === undefined ? {} : { old_line: row.oldLine }),
          ...(row.newLine === undefined ? {} : { new_line: row.newLine }),
        });
        position = { position_type: 'text', ...refs, old_path: target.doc.oldPath, new_path: target.doc.path, ...endpoint(range[range.length - 1]) };
        if (range.length > 1) {
          const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(target.doc.path));
          const stamp = [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, '0')).join('');
          const line = (row: typeof range[number]) => ({ ...endpoint(row), type: row.oldLine === undefined ? 'new' : 'old', line_code: `${stamp}_${row.oldPos}_${row.newPos}` });
          position.line_range = { start: line(range[0]), end: line(range[range.length - 1]) };
        }
      }
      return {
        kind: position ? 'inline' : 'discussion',
        label: position ? 'Post inline on GitLab' : 'Post GitLab discussion (selection quoted)',
        async post(body) {
          requireBody(body);
          const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
          if (!csrf) throw new ReaderError('GitLab’s session token is missing.', 'Copy your draft, reload the merge request, and try again.');
          const { data: latest } = await json<MergeRequest>(`${api}/merge_requests/${ctx.iid}`);
          if (latest.diff_refs?.head_sha !== refs.head_sha || latest.diff_refs?.base_sha !== refs.base_sha || latest.diff_refs?.start_sha !== refs.start_sha) throw new ReaderError('This merge request changed while you were reading.', 'Copy your draft and reopen the reader to comment on the latest version.');
          try {
            const { data } = await getJson<{ notes: Array<{ id: number }> }>(`${api}/merge_requests/${ctx.iid}/discussions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ body: commentContext(target, body), ...(position ? { position } : {}) }) });
            return { url: `${webBase}/-/merge_requests/${ctx.iid}#note_${data.notes[0].id}` };
          } catch (err) {
            if (err instanceof HttpError && (err.status === 401 || err.status === 403)) throw new ReaderError('GitLab did not allow this comment.', 'Make sure you are still signed in and have permission to comment. Your draft is kept.');
            if (err instanceof HttpError && err.status === 0) throw new ReaderError('Could not confirm whether GitLab posted your comment.', 'Check the platform before trying again to avoid a duplicate. Your draft is kept.');
            if (err instanceof HttpError && err.status === 400) throw new ReaderError('GitLab could not attach this comment to the selected lines.', 'The diff may have changed. Copy your draft and reopen the reader.');
            throw explain(err);
          }
        },
      };
    },
    links() {
      return {
        raw: (path) => `${webBase}/-/raw/${refs.head_sha}/${encodePath(path)}`,
        blob: (path) => `${webBase}/-/blob/${refs.head_sha}/${encodePath(path)}`,
      };
    },
  };
}
