import { encodePath, isMarkdownPath } from '../core/paths.ts';
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
      return await getJson<T>(url, { headers: { Accept: 'application/json' } });
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

  const docs: DocRef[] = diffs
    .filter((d) => isMarkdownPath(d.new_path) || isMarkdownPath(d.old_path))
    .map((d) => ({ path: d.new_path, oldPath: d.old_path, status: status(d) }));

  return {
    title: mr.title,
    subtitle: `${ctx.projectPath} · !${ctx.iid}`,
    diffUrl: `${webBase}/-/merge_requests/${ctx.iid}/diffs`,
    docs,
    async load(doc) {
      // base_sha is the merge base: exactly what GitLab's own diff compares against.
      const [base, head] = await Promise.all([
        doc.status === 'added' ? '' : raw(doc.oldPath, refs.base_sha),
        doc.status === 'removed' ? '' : raw(doc.path, refs.head_sha),
      ]);
      return { base, head };
    },
    links() {
      return {
        raw: (path) => `${webBase}/-/raw/${refs.head_sha}/${encodePath(path)}`,
        blob: (path) => `${webBase}/-/blob/${refs.head_sha}/${encodePath(path)}`,
      };
    },
  };
}
