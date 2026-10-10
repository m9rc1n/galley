import { collectDocs, configRoots, docRoots, type TreeEntry } from '../core/discovery.ts';
import { encodePath } from '../core/paths.ts';
import { refCandidates, type GitHubRepoContext } from './detect.ts';
import type { GitHubApi } from './github-api.ts';
import { explainGitHub, readRawFile, readWithRetry } from './github-read.ts';
import { HttpError } from './http.ts';
import { ReaderError, type RepositorySource } from './types.ts';

interface GitTree {
  tree: TreeEntry[];
  truncated: boolean;
}

/** Where a GitHub repository lives: its site, API and name. */
export interface GitHubRepository {
  origin: string;
  apiBase: string;
  owner: string;
  repo: string;
}

/** What one snapshot reads: the commit, the name it was reached by, and where the reader starts. */
interface Snapshot {
  ref: string | null;
  commit: string;
  start: RepositorySource['start'];
  pinned: boolean;
  refresh(): Promise<RepositorySource>;
}

/**
 * A GitHub repository's documents at one commit. The API is used for two things only (see
 * allowedRequest): resolving a branch or tag to a commit, and listing the tree at that commit.
 * Documents are read same-origin, like pull request files, and cost no API quota.
 */
export function githubRepositoryAt(where: GitHubRepository, github: GitHubApi, hasToken: boolean, at: Snapshot): RepositorySource {
  const repoApi = `${where.apiBase}/repos/${where.owner}/${where.repo}`;
  const repoUrl = `${where.origin}/${where.owner}/${where.repo}`;
  const { commit } = at;
  const missing = missingIn(hasToken);
  const api = async <T>(path: string) => {
    try {
      return (await readWithRetry(() => github.request<T>(`${repoApi}${path}`))).data;
    } catch (err) {
      throw explainGitHub(err, hasToken, missing('repository'));
    }
  };
  return {
    platform: 'GitHub',
    id: `github:${repoUrl}`,
    name: `${where.owner}/${where.repo}`,
    ref: at.ref,
    commit,
    pinned: at.pinned,
    start: at.start,
    url: `${repoUrl}/tree/${commit}`,
    async discover() {
      const limits: string[] = [];
      const configLimits: string[] = [];
      const whole = await api<GitTree>(`/git/trees/${commit}?recursive=1`);
      const entries = [...whole.tree];
      if (whole.truncated) {
        // GitHub stops listing very large trees; list the top level, documentation and configuration folders on their own.
        const root = await api<GitTree>(`/git/trees/${commit}`);
        entries.push(...root.tree);
        const folders = docRoots(root.tree);
        const configFolders = configRoots(root.tree);
        for (const folder of [...folders, ...configFolders]) {
          const sub = await api<GitTree>(`/git/trees/${folder.sha}?recursive=1`);
          entries.push(...sub.tree.map((entry) => ({ ...entry, path: `${folder.path}/${entry.path}` })));
          if (sub.truncated) (folders.includes(folder) ? limits : configLimits).push(`GitHub listed only part of ${folder.path}/.`);
        }
        const listed = folders.length ? `Top-level files and ${folders.map((folder) => `${folder.path}/`).join(', ')} are listed in full; ` : '';
        limits.unshift(`This repository is too large for GitHub to list in one go. ${listed}other documents may be missing.`);
        const configListed = configFolders.length ? ` and ${configFolders.map((folder) => `${folder.path}/`).join(', ')}` : '';
        configLimits.unshift(`Only configuration at the top level${configListed} is listed; other files may be missing.`);
      }
      return collectDocs(entries, limits, configLimits);
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
    refresh: at.refresh,
    newIssue: (title, body) => `${repoUrl}/issues/new?${new URLSearchParams({ title, body })}`,
  };
}

const missingIn = (hasToken: boolean) => (what: string) => () =>
  new ReaderError(
    `GitHub could not find this ${what}.`,
    hasToken
      ? 'Make sure your token can read this repository (Contents: read-only).'
      : 'If the repository is private, add a read-only GitHub token in the Galley toolbar popup.',
    !hasToken,
  );

/** The repository page's branch, tag or commit, resolved to one commit. */
export async function loadGitHubRepository(ctx: GitHubRepoContext, github: GitHubApi): Promise<RepositorySource> {
  const hasToken = await github.hasToken();
  const repoApi = `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}`;
  const missing = missingIn(hasToken);
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
  return githubRepositoryAt(ctx, github, hasToken, {
    ref,
    commit,
    // A commit never moves; a branch or tag can be checked again.
    pinned: ref !== null && commit.startsWith(ref),
    start: { path, folder: ctx.view !== 'blob' },
    refresh: () => loadGitHubRepository(ctx, github),
  });
}
