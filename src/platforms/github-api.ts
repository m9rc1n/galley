import { detectRepository, type GitHubRepoContext } from './detect.ts';
import { GRAPHQL_OPERATIONS } from './github-queries.ts';
import { HttpError } from './http.ts';

/**
 * GitHub API access for content scripts. The token is attached by the background worker, so it
 * never enters the page's renderer; content scripts only learn whether one is saved.
 */
export interface GitHubApi {
  hasToken(): Promise<boolean>;
  request<T>(url: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<{ data: T; headers: Headers }>;
}

export type ApiMessage = { type: 'galley:github'; url: string; method: 'GET' | 'POST'; body?: string } | { type: 'galley:has-token' };
export type ApiReply = { status: number; body: string; headers: Record<string, string> } | { error: string };

/** Response headers the reader needs: pagination, rate limits and SSO hints. */
export const FORWARDED_HEADERS = ['link', 'retry-after', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-github-sso'];

export function apiEndpoints(origin: string): { rest: string; graphql: string } {
  return origin === 'https://github.com'
    ? { rest: 'https://api.github.com', graphql: 'https://api.github.com/graphql' }
    : { rest: `${origin}/api/v3`, graphql: `${origin}/api/graphql` };
}

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

/** The file tree at a commit: what a repository page, or a review opening its project docs, lists. */
function treeRead(resource: string, search: URLSearchParams): boolean {
  return /^git\/trees\/[^/]+$/.test(resource) && [...search.keys()].every((key) => key === 'recursive');
}

/** Reading a repository's documents from its page: one ref resolved to its commit, and the file tree. */
function repositoryRead(resource: string, search: URLSearchParams): boolean {
  if (resource === 'commits') return [...search.keys()].every((key) => key === 'sha' || key === 'per_page');
  return treeRead(resource, search);
}

/**
 * The only GitHub API calls Galley makes, for the pull request or repository open in the tab (`page`,
 * when known). The background worker refuses everything else, so a compromised page cannot use it as
 * a general proxy for the reviewer's token. A repository page can only read that repository's tree.
 */
export function allowedRequest(origin: string, page: string | null, url: string, method: string, body?: string): boolean {
  const { rest, graphql } = apiEndpoints(origin);
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  let pull: RegExpExecArray | null = null;
  let repository: { owner: string; repo: string } | null = null;
  if (page) {
    const at = new URL(page);
    pull = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/.exec(at.pathname);
    // Without the page's document only GitHub pages are recognised; the worker checks the address alone.
    repository = pull ? null : (detectRepository(at) as GitHubRepoContext | null);
    if (!pull && !repository) return false;
  }
  if (`${target.origin}${target.pathname}` === graphql && !target.search) {
    if (repository || method !== 'POST' || !body) return false;
    let payload: { query?: unknown; variables?: Record<string, unknown> };
    try {
      payload = JSON.parse(body);
    } catch {
      return false;
    }
    if (!GRAPHQL_OPERATIONS.includes(payload.query as string)) return false;
    const vars = payload.variables ?? {};
    if (
      pull &&
      'owner' in vars &&
      (String(vars.owner).toLowerCase() !== pull[1].toLowerCase() ||
        String(vars.repo).toLowerCase() !== pull[2].toLowerCase() ||
        String(vars.number) !== pull[3])
    )
      return false;
    return true;
  }
  const base = new URL(rest);
  if (target.origin !== base.origin || !target.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/repos/`)) return false;
  const path = target.pathname.slice(base.pathname.replace(/\/$/, '').length);
  const m = /^\/repos\/([^/]+)\/([^/]+)\/(.+)$/.exec(path);
  if (!m) return false;
  const owner = pull?.[1] ?? repository?.owner;
  const repo = pull?.[2] ?? repository?.repo;
  if (owner && (safeDecode(m[1]) !== owner.toLowerCase() || safeDecode(m[2]) !== repo!.toLowerCase())) return false;
  const resource = m[3];
  const number = /^pulls\/(\d+)/.exec(resource)?.[1];
  if (pull && number && number !== pull[3]) return false;
  if (method === 'GET') {
    if (repository) return repositoryRead(resource, target.searchParams);
    if (/^pulls\/\d+(?:\/files|\/comments)?$/.test(resource) || /^compare\/[^/]+$/.test(resource)) return true;
    // A pull request page lists its repository's tree for Project docs; it never resolves other refs.
    // Tests call without a page, and may use every endpoint.
    return page ? treeRead(resource, target.searchParams) : repositoryRead(resource, target.searchParams);
  }
  if (method === 'POST') return !repository && /^pulls\/\d+\/comments$/.test(resource) && !target.search;
  return false;
}

/** The fetch both the worker and the tests use; tokens are only ever sent to https sites. */
export function fetchGitHub(url: string, method: 'GET' | 'POST', body: string | undefined, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token && url.startsWith('https://')) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(url, { method, headers, body, credentials: 'omit', cache: 'no-store' });
}

async function parse<T>(url: string, status: number, text: string, headers: Headers): Promise<{ data: T; headers: Headers }> {
  if (status < 200 || status > 299) throw new HttpError(status, url, headers);
  return { data: JSON.parse(text) as T, headers };
}

/** Content scripts: every request goes through the background worker, which holds the token. */
export function backgroundApi(): GitHubApi {
  const send = async (message: ApiMessage): Promise<unknown> => {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch {
      return { error: 'Galley could not reach its background worker.' };
    }
  };
  return {
    async hasToken() {
      const reply = (await send({ type: 'galley:has-token' })) as { has?: boolean } | undefined;
      return Boolean(reply?.has);
    },
    async request<T>(url: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
      const reply = (await send({
        type: 'galley:github',
        url,
        method: init.method ?? 'GET',
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      })) as ApiReply | undefined;
      if (!reply || 'error' in reply) throw new HttpError(0, url, null);
      return parse<T>(url, reply.status, reply.body, new Headers(reply.headers));
    },
  };
}

/** Tests: the same allowlist and fetch, with the token read directly. */
export function directApi(origin: string, tokenFor: (origin: string) => Promise<string | null>): GitHubApi {
  return {
    async hasToken() {
      return Boolean(await tokenFor(origin));
    },
    async request<T>(url: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}) {
      const method = init.method ?? 'GET';
      const body = init.body === undefined ? undefined : JSON.stringify(init.body);
      if (!allowedRequest(origin, null, url, method, body)) throw new Error(`Galley does not make this request: ${method} ${url}`);
      let res: Response;
      try {
        res = await fetchGitHub(url, method, body, await tokenFor(origin));
      } catch {
        throw new HttpError(0, url, null);
      }
      return parse<T>(url, res.status, await res.text(), res.headers);
    },
  };
}
