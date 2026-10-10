export interface GitHubContext {
  platform: 'github';
  key: string;
  origin: string;
  apiBase: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
}

export interface GitLabContext {
  platform: 'gitlab';
  key: string;
  origin: string;
  /** Path prefix of instances installed under a sub-path (relative_url_root), usually ''. */
  prefix: string;
  projectPath: string;
  projectId: string | null;
  iid: number;
}

export type PageContext = GitHubContext | GitLabContext;

/** Where a repository page points: the repository, a folder, or one Markdown file. */
export interface RepoLocation {
  view: 'root' | 'tree' | 'blob';
  /**
   * Decoded segments after /tree/ or /blob/: the branch, tag or commit followed by the path. A ref
   * may contain slashes, so where it ends is worked out with the API (see refCandidates).
   */
  rest: string[];
}

export interface GitHubRepoContext extends RepoLocation {
  platform: 'github';
  /** This page: the repository, the view and the path. */
  key: string;
  /** The repository alone, whichever of its pages is open. */
  repository: string;
  origin: string;
  apiBase: string;
  owner: string;
  repo: string;
}

export interface GitLabRepoContext extends RepoLocation {
  platform: 'gitlab';
  key: string;
  repository: string;
  origin: string;
  prefix: string;
  projectPath: string;
  projectId: string | null;
}

export type RepoContext = GitHubRepoContext | GitLabRepoContext;

const GITHUB_PR = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;
const GITLAB_MR = /^(.*)\/-\/merge_requests\/(\d+)(?:\/|$)/;
const GITHUB_REPO = /^\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(tree|blob)\/(.+?))?\/?$/;
const GITLAB_REPO_PAGE = /^(.*?)\/-\/(tree|blob)\/(.+?)\/?$/;
/** At most this many ways to split a ref containing slashes from the path after it. */
const MAX_REF_CANDIDATES = 4;

/** GitHub's own top-level routes: `/settings/profile` is not a repository called "profile". */
const GITHUB_RESERVED = new Set(
  (
    'about account apps codespaces collections contact copilot customer-stories dashboard discussions enterprise enterprises events explore features ' +
    'github-copilot home issues join login logout marketplace models new notifications orgs organizations password_reset pricing pulls readme ' +
    'resources search security sessions settings signup site solutions sponsors stafftools stars team topics trending users watching'
  ).split(' '),
);

const decode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const MARKDOWN = /\.(md|markdown|mdown|mkd|mdx)$/i;

/** A file page is only a starting point for the reader when the file is Markdown. */
function location(view: string | undefined, rest: string | undefined): RepoLocation | null {
  if (!view) return { view: 'root', rest: [] };
  const segments = rest!.split('/').map(decode);
  if (view === 'blob' && (segments.length < 2 || !MARKDOWN.test(segments.at(-1)!))) return null;
  return { view: view as RepoLocation['view'], rest: segments };
}

/**
 * Ways to read `rest` as a ref followed by a path, shortest ref first, as GitHub and GitLab do when
 * both a branch `a` and a branch `a/b` could match. A file page always keeps a path after the ref.
 */
export function refCandidates(loc: RepoLocation): Array<{ ref: string | null; path: string }> {
  if (loc.view === 'root') return [{ ref: null, path: '' }];
  const longest = Math.min(loc.rest.length - (loc.view === 'blob' ? 1 : 0), MAX_REF_CANDIDATES);
  return Array.from({ length: longest }, (_, i) => ({ ref: loc.rest.slice(0, i + 1).join('/'), path: loc.rest.slice(i + 1).join('/') }));
}

/** Work out whether the page shows a repository, one of its folders, or a Markdown file in it. */
export function detectRepository(loc: Pick<Location, 'origin' | 'pathname'>, doc?: Document): RepoContext | null {
  const fullPath = doc?.body?.dataset.projectFullPath;
  if (fullPath) {
    // GitLab marks every project page with its canonical path, which also reveals sub-path installs.
    const page = GITLAB_REPO_PAGE.exec(loc.pathname);
    const pathPart = page ? page[1] : loc.pathname.replace(/\/$/, '');
    if (!pathPart.endsWith(`/${fullPath}`)) return null;
    const where = location(page?.[2], page?.[3]);
    if (!where) return null;
    const prefix = pathPart.slice(0, pathPart.length - fullPath.length - 1);
    return {
      platform: 'gitlab',
      key: `repo:gitlab:${loc.origin}${prefix}/${fullPath}/${where.view}/${where.rest.join('/')}`,
      repository: `repo:gitlab:${loc.origin}${prefix}/${fullPath}`,
      origin: loc.origin,
      prefix,
      projectPath: fullPath,
      projectId: doc!.body.dataset.projectId ?? null,
      ...where,
    };
  }
  if (doc?.body?.dataset.page !== undefined) return null; // another GitLab page, such as a group
  const gh = GITHUB_REPO.exec(loc.pathname);
  if (!gh || GITHUB_RESERVED.has(gh[1].toLowerCase())) return null;
  const where = location(gh[3], gh[4]);
  if (!where) return null;
  return {
    platform: 'github',
    key: `repo:github:${loc.origin}/${gh[1]}/${gh[2]}/${where.view}/${where.rest.join('/')}`,
    repository: `repo:github:${loc.origin}/${gh[1]}/${gh[2]}`,
    origin: loc.origin,
    apiBase: loc.origin === 'https://github.com' ? 'https://api.github.com' : `${loc.origin}/api/v3`,
    owner: gh[1],
    repo: gh[2],
    ...where,
  };
}

/** "Fix typo by octocat · Pull Request #12 · owner/repo · GitHub" → "Fix typo" */
function githubTitle(documentTitle: string, number: number): string {
  const head = documentTitle.split(' · Pull Request #')[0];
  const title = head === documentTitle ? '' : head.replace(/ by [^ ]+$/, '').trim();
  return title || `Pull request #${number}`;
}

/** Work out whether the current page is a GitHub pull request or a GitLab merge request. */
export function detectContext(loc: Pick<Location, 'origin' | 'pathname'>, doc?: Document): PageContext | null {
  const gh = GITHUB_PR.exec(loc.pathname);
  if (gh) {
    const number = Number(gh[3]);
    return {
      platform: 'github',
      key: `github:${loc.origin}/${gh[1]}/${gh[2]}#${number}`,
      origin: loc.origin,
      apiBase: loc.origin === 'https://github.com' ? 'https://api.github.com' : `${loc.origin}/api/v3`,
      owner: gh[1],
      repo: gh[2],
      number,
      title: githubTitle(doc?.title ?? '', number),
    };
  }
  const gl = GITLAB_MR.exec(loc.pathname);
  if (gl) {
    const pathPart = gl[1];
    const iid = Number(gl[2]);
    // GitLab puts the canonical project path on <body>; it tells us about sub-path installs too.
    const fullPath = doc?.body?.dataset.projectFullPath;
    let projectPath = pathPart.replace(/^\//, '');
    let prefix = '';
    if (fullPath && pathPart.endsWith(`/${fullPath}`)) {
      projectPath = fullPath;
      prefix = pathPart.slice(0, pathPart.length - fullPath.length - 1);
    }
    return {
      platform: 'gitlab',
      key: `gitlab:${loc.origin}${prefix}/${projectPath}!${iid}`,
      origin: loc.origin,
      prefix,
      projectPath,
      projectId: doc?.body?.dataset.projectId ?? null,
      iid,
    };
  }
  return null;
}
