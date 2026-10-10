import { collectDocs, docRoots, type TreeEntry } from '../core/discovery.ts';
import { encodePath } from '../core/paths.ts';
import { refCandidates, type GitHubRepoContext } from './detect.ts';
import type { GitHubApi } from './github-api.ts';
import { explainGitHub, readRawFile, readWithRetry } from './github.ts';
import { HttpError } from './http.ts';
import { ReaderError, type RepositorySource } from './types.ts';

interface GitTree {
  tree: TreeEntry[];
  truncated: boolean;
}

/**
 * A GitHub repository's documents at one commit. The API is used for two things only (see
 * allowedRequest): resolving the page's branch or tag to a commit, and listing the tree at that
 * commit. Documents are read same-origin, like pull request files, and cost no API quota.
 */
export async function loadGitHubRepository(ctx: GitHubRepoContext, github: GitHubApi): Promise<RepositorySource> {
  const hasToken = await github.hasToken();
  const repoApi = `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}`;
  const repoUrl = `${ctx.origin}/${ctx.owner}/${ctx.repo}`;
  const missing = (what: string) => () =>
    new ReaderError(
      `GitHub could not find this ${what}.`,
      hasToken
        ? 'Make sure your token can read this repository (Contents: read-only).'
        : 'If the repository is private, add a read-only GitHub token in the Galley toolbar popup.',
      !hasToken,
    );
  const api = async <T>(path: string) => {
    try {
      return (await readWithRetry(() => github.request<T>(`${repoApi}${path}`))).data;
    } catch (err) {
      throw explainGitHub(err, hasToken, missing('repository'));
    }
  };

  // The shortest ref GitHub knows wins, as on github.com itself. One small request per candidate.
  let resolved: { ref: string | null; path: string; commit: string } | null = null;
  for (const candidate of refCandidates(ctx)) {
    const query = candidate.ref === null ? '' : `sha=${encodeURIComponent(candidate.ref)}&`;
    try {
      const [latest] = await readWithRetry(() => github.request<Array<{ sha: string }>>(`${repoApi}/commits?${query}per_page=1`)).then((r) => r.data);
      resolved = { ...candidate, commit: latest.sha };
      break;
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) throw new ReaderError('This repository has no commits yet.', 'There is nothing to read here.');
      // Not a branch, tag or commit: the ref may be longer.
      if (!(err instanceof HttpError) || (err.status !== 404 && err.status !== 422)) throw explainGitHub(err, hasToken, missing('repository'));
    }
  }
  if (!resolved) throw missing(ctx.view === 'root' ? 'repository' : 'branch or tag')();
  const { ref, path, commit } = resolved;

  return {
    platform: 'GitHub',
    name: `${ctx.owner}/${ctx.repo}`,
    ref,
    commit,
    start: { path, folder: ctx.view !== 'blob' },
    url: `${repoUrl}/tree/${commit}`,
    async discover() {
      const limits: string[] = [];
      const whole = await api<GitTree>(`/git/trees/${commit}?recursive=1`);
      const entries = [...whole.tree];
      if (whole.truncated) {
        // GitHub stops listing very large trees; list the top level and documentation folders on their own.
        const root = await api<GitTree>(`/git/trees/${commit}`);
        entries.push(...root.tree);
        const folders = docRoots(root.tree);
        for (const folder of folders) {
          const sub = await api<GitTree>(`/git/trees/${folder.sha}?recursive=1`);
          entries.push(...sub.tree.map((entry) => ({ ...entry, path: `${folder.path}/${entry.path}` })));
          if (sub.truncated) limits.push(`GitHub listed only part of ${folder.path}/.`);
        }
        const listed = folders.length ? `Top-level files and ${folders.map((folder) => `${folder.path}/`).join(', ')} are listed in full; ` : '';
        limits.unshift(`This repository is too large for GitHub to list in one go. ${listed}other documents may be missing.`);
      }
      return collectDocs(entries, limits);
    },
    async load(file) {
      try {
        return await readRawFile(`${repoUrl}/raw/${commit}/${encodePath(file)}`);
      } catch (err) {
        if (err instanceof HttpError && err.status === 404)
          throw new ReaderError('This document is not in the repository at this commit.', 'The link may point to a file that was moved or removed.');
        throw explainGitHub(err, hasToken, missing('repository'));
      }
    },
    links: {
      raw: (file) => `${repoUrl}/raw/${commit}/${encodePath(file)}`,
      blob: (file) => `${repoUrl}/blob/${commit}/${encodePath(file)}`,
    },
    refresh: () => loadGitHubRepository(ctx, github),
  };
}
