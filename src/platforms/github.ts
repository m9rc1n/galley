import { reconstructBase } from '../core/patch.ts';
import { encodePath, isMarkdownPath } from '../core/paths.ts';
import type { GitHubContext } from './detect.ts';
import { getJson, getText, HttpError } from './http.ts';
import { ReaderError, type DocRef, type DocStatus, type ReviewSource } from './types.ts';

interface GitHubFile {
  filename: string;
  previous_filename?: string;
  status: string;
  changes: number;
  patch?: string;
  raw_url: string;
}

interface GitHubDoc extends DocRef {
  file: GitHubFile;
}

const MAX_PAGES = 10;

function mapStatus(status: string): DocStatus {
  if (status === 'added' || status === 'copied') return 'added';
  if (status === 'removed') return 'removed';
  if (status === 'renamed') return 'renamed';
  return 'modified';
}

function explain(err: unknown, hasToken: boolean): Error {
  if (!(err instanceof HttpError)) return err instanceof Error ? err : new Error(String(err));
  const remaining = err.headers?.get('x-ratelimit-remaining');
  if ((err.status === 403 || err.status === 429) && remaining === '0') {
    return new ReaderError(
      'GitHub API rate limit reached.',
      hasToken
        ? 'Wait a few minutes and try again.'
        : 'Without a token GitHub allows 60 requests per hour. Add a read-only token in the mreadie toolbar popup to raise the limit.',
      !hasToken,
    );
  }
  if (err.status === 403 && err.headers?.get('x-github-sso')) {
    return new ReaderError('Your GitHub token is not authorized for this organization.', 'Authorize the token for SSO in your GitHub token settings.', true);
  }
  if (err.status === 401) return new ReaderError('GitHub rejected the token.', 'Replace it in the mreadie toolbar popup.', true);
  if (err.status === 404) {
    return hasToken
      ? new ReaderError('GitHub could not find this pull request with your token.', 'Make sure the token can read this repository (Contents and Pull requests: read-only).', true)
      : new ReaderError('This pull request is in a private repository.', 'Add a read-only GitHub token in the mreadie toolbar popup to read private pull requests.', true);
  }
  if (err.status === 0) return new ReaderError('Could not reach GitHub.', 'Check your connection and try again.');
  return new ReaderError(`GitHub returned an error (${err.status}).`, 'Try again in a moment.');
}

export async function loadGitHub(ctx: GitHubContext, token: string | null): Promise<ReviewSource> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = async <T>(path: string) => {
    try {
      return await getJson<T>(`${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}${path}`, { headers, credentials: 'omit' });
    } catch (err) {
      throw explain(err, Boolean(token));
    }
  };

  const files: GitHubFile[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await api<GitHubFile[]>(`/pulls/${ctx.number}/files?per_page=100&page=${page}`);
    files.push(...data);
    if (data.length < 100) break;
  }

  // raw_url is https://<host>/<owner>/<repo>/raw/<head sha>/<path>
  const headSha = files.map((f) => /\/raw\/([0-9a-f]{40})\//.exec(f.raw_url)?.[1]).find(Boolean) ?? '';
  const repoUrl = `${ctx.origin}/${ctx.owner}/${ctx.repo}`;
  // Same-origin raw URLs work for public and private repositories alike: the browser session
  // authorises them and GitHub redirects to raw.githubusercontent.com.
  const raw = (sha: string, path: string) => `${repoUrl}/raw/${sha}/${encodePath(path)}`;

  let mergeBase: Promise<string> | null = null;
  const getMergeBase = () =>
    (mergeBase ??= (async () => {
      const { data: pr } = await api<{ base: { sha: string }; head: { sha: string } }>(`/pulls/${ctx.number}`);
      const { data: cmp } = await api<{ merge_base_commit: { sha: string } }>(`/compare/${pr.base.sha}...${pr.head.sha}`);
      return cmp.merge_base_commit.sha;
    })());

  const docs: GitHubDoc[] = files
    .filter((f) => isMarkdownPath(f.filename) && f.status !== 'unchanged')
    .map((f) => ({ path: f.filename, oldPath: f.previous_filename ?? f.filename, status: mapStatus(f.status), file: f }));

  return {
    title: ctx.title,
    subtitle: `${ctx.owner}/${ctx.repo} · #${ctx.number}`,
    diffUrl: `${repoUrl}/pull/${ctx.number}/files`,
    docs,
    async load(ref) {
      const { file } = ref as GitHubDoc;
      const head = ref.status === 'removed' ? '' : await getText(raw(headSha, ref.path));
      if (ref.status === 'added') return { base: '', head };
      if (file.patch) {
        const base = reconstructBase(head, file.patch);
        if (base !== null) return { base, head };
      } else if (file.changes === 0) {
        return { base: head, head }; // pure rename
      }
      // Large diffs come without a patch: fetch the old version at the merge base instead.
      const base = await getText(raw(await getMergeBase(), ref.oldPath));
      return { base, head };
    },
    links() {
      return {
        raw: (path) => raw(headSha, path),
        blob: (path) => `${repoUrl}/blob/${headSha}/${encodePath(path)}`,
      };
    },
  };
}
