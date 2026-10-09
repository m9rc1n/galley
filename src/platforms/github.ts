import { githubViewed } from './github-viewed.ts';
import { commentContext, diffRange, githubThreads, requireBody, validateTarget, type GitHubReviewComment } from './comments.ts';
import { reconstructBase } from '../core/patch.ts';
import { encodePath, isMarkdownPath, isCodePath } from '../core/paths.ts';
import type { GitHubContext } from './detect.ts';
import type { GitHubApi } from './github-api.ts';
import { getText, HttpError } from './http.ts';
import { ReaderError, type DocRef, type DocStatus, type ReviewSource, type Thread } from './types.ts';

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
const READ_RETRY_DELAYS = [250, 750];

/** Briefly retry transient reads, keeping the same URL/revision. Writes never pass through here. */
async function readWithRetry<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (!(err instanceof HttpError) || attempt >= READ_RETRY_DELAYS.length) throw err;
      const retryAfter = err.headers?.get('retry-after');
      if (err.status === 403 || err.status === 429) {
        // Secondary limits may name a short cooldown. Quota and permission failures need action.
        if (!retryAfter || err.headers?.get('x-ratelimit-remaining') === '0' || err.headers?.get('x-github-sso')) throw err;
      } else if (![0, 408, 500, 502, 503, 504].includes(err.status)) throw err;
      const cooldown = Number(retryAfter ?? '0') * 1000;
      // Do not retry before GitHub's requested cooldown or leave the reader waiting for a long one.
      if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 2000) throw err;
      await new Promise((resolve) => setTimeout(resolve, Math.max(READ_RETRY_DELAYS[attempt], cooldown)));
    }
  }
}

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
      ? new ReaderError(
          'GitHub could not find this pull request with your token.',
          'Make sure the token can read this repository (Contents and Pull requests: read-only).',
          true,
        )
      : new ReaderError(
          'This pull request is in a private repository.',
          'Add a read-only GitHub token in the Galley toolbar popup to read private pull requests.',
          true,
        );
  }
  if (err.status === 0) return new ReaderError('Could not reach GitHub.', 'Check your connection and try again.');
  return new ReaderError(`GitHub returned an error (${err.status}).`, 'Try again in a moment.');
}

/**
 * `github` makes the API calls; in the extension it is the background worker, which holds the token
 * (see github-api.ts). Raw files are read same-origin with the reviewer's GitHub session.
 */
export async function loadGitHub(ctx: GitHubContext, github: GitHubApi): Promise<ReviewSource> {
  const hasToken = await github.hasToken();
  const repoApi = `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}`;
  const api = async <T>(path: string) => {
    try {
      return await readWithRetry(() => github.request<T>(`${repoApi}${path}`));
    } catch (err) {
      throw explain(err, hasToken);
    }
  };

  const { data: pr } = await api<{ base: { sha: string }; head: { sha: string }; title?: string; body?: string | null; user?: { login: string } | null }>(
    `/pulls/${ctx.number}`,
  );

  const files: GitHubFile[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await api<GitHubFile[]>(`/pulls/${ctx.number}/files?per_page=100&page=${page}`);
    files.push(...data);
    if (data.length < 100) break;
  }

  // Use PR metadata: a removed file’s raw_url can point at the base commit.
  const { data: snapshot } = await api<{ head: { sha: string }; base: { sha: string } }>(`/pulls/${ctx.number}`);
  if (snapshot.head.sha !== pr.head.sha || snapshot.base.sha !== pr.base.sha)
    throw new ReaderError('This pull request changed while loading.', 'Reopen the reader to load the latest version.');
  const headSha = pr.head.sha;
  const repoUrl = `${ctx.origin}/${ctx.owner}/${ctx.repo}`;
  // Same-origin raw URLs work for public and private repositories alike: the browser session
  // authorises them and GitHub redirects to raw.githubusercontent.com.
  const raw = (sha: string, path: string) => `${repoUrl}/raw/${sha}/${encodePath(path)}`;
  const readRaw = (sha: string, path: string) => {
    const url = raw(sha, path);
    return readWithRetry(async () => {
      try {
        return await getText(url, { cache: 'no-store' });
      } catch (err) {
        // A connection can also fail while consuming an otherwise successful response body.
        if (err instanceof TypeError) throw new HttpError(0, url, null);
        throw err;
      }
    });
  };

  let mergeBase: Promise<string> | null = null;
  const getMergeBase = () =>
    (mergeBase ??= (async () => {
      const { data: cmp } = await api<{ merge_base_commit: { sha: string } }>(`/compare/${pr.base.sha}...${pr.head.sha}`);
      return cmp.merge_base_commit.sha;
    })().catch((err) => {
      mergeBase = null;
      throw err;
    }));

  const all: GitHubDoc[] = files
    .filter(
      (f) =>
        (isMarkdownPath(f.filename) || isMarkdownPath(f.previous_filename ?? '') || isCodePath(f.filename) || isCodePath(f.previous_filename ?? '')) &&
        f.status !== 'unchanged',
    )
    .map((f) => ({
      path: f.filename,
      oldPath: f.previous_filename ?? f.filename,
      status: mapStatus(f.status),
      file: f,
      ...(!(isMarkdownPath(f.filename) || isMarkdownPath(f.previous_filename ?? '')) ? { kind: 'code' as const } : {}),
    }));
  const docs = all.filter((doc) => doc.kind !== 'code');
  const codeDocs = all.filter((doc) => doc.kind === 'code');

  const replyFor = (id: number): Thread['reply'] =>
    !Number.isSafeInteger(id) || id < 1
      ? undefined
      : async (body) => {
          requireBody(body);
          if (!(await github.hasToken()))
            throw new ReaderError('Add a GitHub token to reply.', 'In the Galley popup, save a token with Pull requests: read and write. Your draft is kept.');
          try {
            // in_reply_to always refers to the root, including when the user replies after another reply.
            const { data } = await github.request<{ html_url: string }>(`${repoApi}/pulls/${ctx.number}/comments`, {
              method: 'POST',
              body: { body: body.trim(), in_reply_to: id },
            });
            return { url: data.html_url };
          } catch (err) {
            if (err instanceof HttpError && err.status === 403)
              throw new ReaderError(
                'GitHub did not allow this reply.',
                'Check Pull requests: read and write access and repository permissions. Your draft is kept.',
              );
            if (err instanceof HttpError && (err.status === 404 || err.status === 422))
              throw new ReaderError('GitHub could not find this conversation or accept the reply.', 'Check the thread on GitHub. Your draft is kept.');
            if (err instanceof HttpError && err.status === 0)
              throw new ReaderError(
                'Could not confirm whether GitHub posted your reply.',
                'Check the platform before trying again to avoid a duplicate. Your draft is kept.',
              );
            throw explain(err, true);
          }
        };

  return {
    title: ctx.title,
    subtitle: `${ctx.owner}/${ctx.repo} · #${ctx.number}`,
    overview: {
      kind: 'Pull request',
      title: pr.title ?? ctx.title,
      description: pr.body ?? '',
      author: pr.user?.login ?? '',
      url: `${repoUrl}/pull/${ctx.number}`,
    },
    diffUrl: `${repoUrl}/pull/${ctx.number}/files`,
    docs,
    codeDocs,
    viewed: hasToken ? githubViewed(ctx, github, all, headSha, pr.base.sha) : undefined,
    async load(ref) {
      const { file } = ref as GitHubDoc;
      const head = ref.status === 'removed' ? '' : await readRaw(headSha, ref.path);
      if (ref.status === 'added') return { base: '', head };
      if (file.patch) {
        const base = reconstructBase(head, file.patch);
        if (base !== null) return { base, head };
      } else if (file.changes === 0) {
        return { base: head, head }; // pure rename
      }
      // Large diffs come without a patch: fetch the old version at the merge base instead.
      const base = await readRaw(await getMergeBase(), ref.oldPath);
      return { base, head };
    },
    async loadThreads() {
      const comments: GitHubReviewComment[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data } = await api<GitHubReviewComment[]>(`/pulls/${ctx.number}/comments?per_page=100&page=${page}`);
        comments.push(...data);
        if (data.length < 100) break;
      }
      return githubThreads(all, comments, replyFor);
    },
    async prepareComment(target) {
      validateTarget(all, target);
      const file = (target.doc as GitHubDoc).file;
      const range = diffRange(file.patch, target);
      const kind = range ? 'inline' : 'file';
      return {
        kind,
        label: range ? 'Post inline on GitHub' : 'Post file comment on GitHub (selection quoted)',
        async post(body) {
          requireBody(body);
          // Checked at posting time, so a token saved after opening the reader is picked up.
          if (!(await github.hasToken()))
            throw new ReaderError(
              'Add a GitHub token to comment.',
              'In the Galley popup, save a token with Contents: read and Pull requests: read and write. Your draft is kept.',
            );
          try {
            const { data: latest } = await github.request<{ head: { sha: string }; base: { sha: string } }>(`${repoApi}/pulls/${ctx.number}`);
            if (latest.head.sha !== headSha || latest.base.sha !== pr.base.sha)
              throw new ReaderError(
                'This pull request changed while you were reading.',
                'Copy your draft and reopen the reader to comment on the latest version.',
              );
            const side = target.side === 'base' ? 'LEFT' : 'RIGHT';
            const payload = range
              ? {
                  body: commentContext(target, body),
                  path: target.doc.path,
                  commit_id: headSha,
                  line: target.endLine,
                  side,
                  ...(target.startLine < target.endLine ? { start_line: target.startLine, start_side: side } : {}),
                }
              : { body: commentContext(target, body), path: target.doc.path, commit_id: headSha, subject_type: 'file' };
            const { data } = await github.request<{ id: number; html_url: string }>(`${repoApi}/pulls/${ctx.number}/comments`, {
              method: 'POST',
              body: payload,
            });
            return { url: data.html_url, reply: replyFor(data.id) };
          } catch (err) {
            if (err instanceof HttpError && err.status === 403)
              throw new ReaderError(
                'GitHub did not allow this comment.',
                'Check Pull requests: read and write access, repository permissions and any SSO authorization. Your draft is kept.',
              );
            if (err instanceof HttpError && err.status === 422)
              throw new ReaderError(
                'GitHub could not attach this comment to the selected lines.',
                'The diff may have changed. Copy your draft and reopen the reader.',
              );
            if (err instanceof HttpError && err.status === 0)
              throw new ReaderError(
                'Could not confirm whether GitHub posted your comment.',
                'Check the platform before trying again to avoid a duplicate. Your draft is kept.',
              );
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
