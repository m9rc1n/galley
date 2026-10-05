import { githubViewed } from './github-viewed.ts';
import { getToken } from '../ui/settings.ts';
import { commentContext, diffRange, requireBody, validateTarget } from './comments.ts';
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
        : 'Without a token GitHub allows 60 requests per hour. Add a read-only token in the Galley toolbar popup to raise the limit.',
      !hasToken,
    );
  }
  if (err.status === 403 && err.headers?.get('x-github-sso')) {
    return new ReaderError('Your GitHub token is not authorized for this organization.', 'Authorize the token for SSO in your GitHub token settings.', true);
  }
  if (err.status === 401) return new ReaderError('GitHub rejected the token.', 'Replace it in the Galley toolbar popup.', true);
  if (err.status === 404) {
    return hasToken
      ? new ReaderError('GitHub could not find this pull request with your token.', 'Make sure the token can read this repository (Contents and Pull requests: read-only).', true)
      : new ReaderError('This pull request is in a private repository.', 'Add a read-only GitHub token in the Galley toolbar popup to read private pull requests.', true);
  }
  if (err.status === 0) return new ReaderError('Could not reach GitHub.', 'Check your connection and try again.');
  return new ReaderError(`GitHub returned an error (${err.status}).`, 'Try again in a moment.');
}

export async function loadGitHub(ctx: GitHubContext, token: string | null): Promise<ReviewSource> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const api = async <T>(path: string) => {
    try {
      return await getJson<T>(`${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}${path}`, { headers, credentials: 'omit', cache: 'no-store' });
    } catch (err) {
      throw explain(err, Boolean(token));
    }
  };

  const { data: pr } = await api<{ base: { sha: string }; head: { sha: string } }>(`/pulls/${ctx.number}`);

  const files: GitHubFile[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await api<GitHubFile[]>(`/pulls/${ctx.number}/files?per_page=100&page=${page}`);
    files.push(...data);
    if (data.length < 100) break;
  }

  // Use PR metadata: a removed file’s raw_url can point at the base commit.
  const { data: snapshot } = await api<{ head: { sha: string }; base: { sha: string } }>(`/pulls/${ctx.number}`);
  if (snapshot.head.sha !== pr.head.sha || snapshot.base.sha !== pr.base.sha) throw new ReaderError('This pull request changed while loading.', 'Reopen the reader to load the latest version.');
  const headSha = pr.head.sha;
  const repoUrl = `${ctx.origin}/${ctx.owner}/${ctx.repo}`;
  // Same-origin raw URLs work for public and private repositories alike: the browser session
  // authorises them and GitHub redirects to raw.githubusercontent.com.
  const raw = (sha: string, path: string) => `${repoUrl}/raw/${sha}/${encodePath(path)}`;

  let mergeBase: Promise<string> | null = null;
  const getMergeBase = () =>
    (mergeBase ??= (async () => {
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
    viewed: token ? githubViewed(ctx, docs, headSha, pr.base.sha) : undefined,
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
    async prepareComment(target) {
      validateTarget(docs, target);
      const file = (target.doc as GitHubDoc).file;
      const range = diffRange(file.patch, target);
      const kind = range ? 'inline' : 'file';
      return {
        kind,
        label: range ? 'Post inline on GitHub' : 'Post file comment on GitHub (paragraph quoted)',
        async post(body) {
          requireBody(body);
          const currentToken = await getToken(ctx.origin);
          if (!currentToken) throw new ReaderError('Add a GitHub token to comment.', 'In the Galley popup, save a token with Contents: read and Pull requests: read and write. Your draft is kept.');
          const writeHeaders = { ...headers, Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' };
          try {
            const { data: latest } = await getJson<{ head: { sha: string }; base: { sha: string } }>(`${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.number}`, { headers: writeHeaders, credentials: 'omit', cache: 'no-store' });
            if (latest.head.sha !== headSha || latest.base.sha !== pr.base.sha) throw new ReaderError('This pull request changed while you were reading.', 'Copy your draft and reopen the reader to comment on the latest version.');
            const side = target.side === 'base' ? 'LEFT' : 'RIGHT';
            const payload = range
              ? { body: commentContext(target, body), path: target.doc.path, commit_id: headSha, line: target.endLine, side, ...(target.startLine < target.endLine ? { start_line: target.startLine, start_side: side } : {}) }
              : { body: commentContext(target, body), path: target.doc.path, commit_id: headSha, subject_type: 'file' };
            const { data } = await getJson<{ html_url: string }>(`${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.number}/comments`, { method: 'POST', headers: writeHeaders, credentials: 'omit', body: JSON.stringify(payload) });
            return { url: data.html_url };
          } catch (err) {
            if (err instanceof HttpError && err.status === 403) throw new ReaderError('GitHub did not allow this comment.', 'Check Pull requests: read and write access, repository permissions and any SSO authorization. Your draft is kept.');
            if (err instanceof HttpError && err.status === 422) throw new ReaderError('GitHub could not attach this comment to the selected lines.', 'The diff may have changed. Copy your draft and reopen the reader.');
            if (err instanceof HttpError && err.status === 0) throw new ReaderError('Could not confirm whether GitHub posted your comment.', 'Check the platform before trying again to avoid a duplicate. Your draft is kept.');
            throw explain(err, true);
          }
        },
      };
    },
    links() {
      return {
        raw: (path) => raw(headSha, path),
        blob: (path) => `${repoUrl}/blob/${headSha}/${encodePath(path)}`,
      };
    },
  };
}
