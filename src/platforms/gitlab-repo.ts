import { collectDocs, docRoots, type TreeEntry } from '../core/discovery.ts';
import { encodePath } from '../core/paths.ts';
import { refCandidates, type GitLabRepoContext } from './detect.ts';
import { getJson, getText, HttpError } from './http.ts';
import { ReaderError, type RepositorySource } from './types.ts';

/** Pages of 100 entries for the whole tree; a repository larger than this is listed by folder. */
const TREE_PAGES = 20;
/** Pages for each documentation folder listed on its own. */
const FOLDER_PAGES = 5;

function explain(err: unknown): Error {
  // Requests fail with an HttpError; a page that is not JSON fails to parse, with its own error.
  if (!(err instanceof HttpError)) return err as Error;
  if (err.status === 401 || err.status === 403 || err.status === 404) {
    return new ReaderError('GitLab did not return this project.', 'Make sure you are signed in and can see this project.');
  }
  if (err.status === 429) return new ReaderError('GitLab rate limit reached.', 'Wait a minute and try again.');
  if (err.status === 0) return new ReaderError('Could not reach GitLab.', 'Check your connection and try again.');
  return new ReaderError(`GitLab returned an error (${err.status}).`, 'Try again in a moment.');
}

/** A GitLab project's documents at one commit, read with the browser session like merge requests. */
export async function loadGitLabRepository(ctx: GitLabRepoContext): Promise<RepositorySource> {
  const api = `${ctx.origin}${ctx.prefix}/api/v4/projects/${ctx.projectId ?? encodeURIComponent(ctx.projectPath)}`;
  const webBase = `${ctx.origin}${ctx.prefix}/${ctx.projectPath}`;
  const json = async <T>(url: string) => {
    try {
      return await getJson<T>(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    } catch (err) {
      throw explain(err);
    }
  };

  // The shortest ref GitLab knows wins, as in GitLab's own pages; HEAD is the default branch.
  let resolved: { ref: string | null; path: string; commit: string } | null = null;
  for (const candidate of refCandidates(ctx)) {
    try {
      const { data } = await getJson<{ id: string }>(`${api}/repository/commits/${encodeURIComponent(candidate.ref ?? 'HEAD')}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      resolved = { ...candidate, commit: data.id };
      break;
    } catch (err) {
      // Not a branch, tag or commit: the ref may be longer. Anything else is a real failure.
      if (!(err instanceof HttpError) || err.status !== 404) throw explain(err);
    }
  }
  if (!resolved)
    throw new ReaderError(
      ctx.view === 'root' ? 'GitLab did not return this project.' : 'GitLab could not find this branch or tag.',
      ctx.view === 'root'
        ? 'Make sure you are signed in and can see this project, and that it has commits.'
        : 'Make sure you are signed in and can see this project.',
    );
  const { ref, path, commit } = resolved;

  /** Recursive listing of one folder ('' for all), at most `pages` pages of 100. */
  const list = async (folder: string, pages: number, recursive = true) => {
    const entries: TreeEntry[] = [];
    for (let page = 1; page <= pages; page++) {
      const query = new URLSearchParams({ ...(folder ? { path: folder } : {}), ...(recursive ? { recursive: 'true' } : {}), per_page: '100', ref: commit });
      const { data, headers } = await json<TreeEntry[]>(`${api}/repository/tree?${query}&page=${page}`);
      entries.push(...data);
      if (!headers.get('x-next-page')) return { entries, complete: true };
    }
    return { entries, complete: false };
  };

  return {
    platform: 'GitLab',
    name: ctx.projectPath,
    ref,
    commit,
    start: { path, folder: ctx.view !== 'blob' },
    url: `${webBase}/-/tree/${commit}`,
    async discover() {
      const limits: string[] = [];
      const whole = await list('', TREE_PAGES);
      const entries = whole.entries;
      if (!whole.complete) {
        const root = await list('', 1, false);
        entries.push(...root.entries);
        const folders = docRoots(root.entries);
        for (const folder of folders) {
          const sub = await list(folder.path, FOLDER_PAGES);
          entries.push(...sub.entries);
          if (!sub.complete) limits.push(`Only part of ${folder.path}/ is listed.`);
        }
        const listed = folders.length
          ? `${folders.map((folder) => `${folder.path}/`).join(', ')} ${folders.length === 1 ? 'is' : 'are'} listed separately; `
          : '';
        limits.unshift(`This repository has more files than Galley lists at once. ${listed}other documents may be missing.`);
      }
      return collectDocs(entries, limits);
    },
    async load(file) {
      try {
        return await getText(`${api}/repository/files/${encodeURIComponent(file)}/raw?ref=${commit}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404)
          throw new ReaderError('This document is not in the repository at this commit.', 'The link may point to a file that was moved or removed.');
        throw explain(err);
      }
    },
    links: {
      raw: (file) => `${webBase}/-/raw/${commit}/${encodePath(file)}`,
      blob: (file) => `${webBase}/-/blob/${commit}/${encodePath(file)}`,
    },
    refresh: () => loadGitLabRepository(ctx),
  };
}
