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

const GITHUB_PR = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;
const GITLAB_MR = /^(.*)\/-\/merge_requests\/(\d+)(?:\/|$)/;

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
