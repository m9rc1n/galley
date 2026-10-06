import { getToken } from '../ui/settings.ts';
import type { GitHubContext } from './detect.ts';
import { getJson, HttpError } from './http.ts';
import { ReaderError, type DocRef, type ReviewSource } from './types.ts';

const FILES_QUERY = `query($owner:String!,$repo:String!,$number:Int!,$after:String) {
  repository(owner:$owner,name:$repo) { pullRequest(number:$number) {
    id headRefOid baseRefOid files(first:100,after:$after) {
      nodes { path viewerViewedState } pageInfo { hasNextPage endCursor }
    }
  } }
}`;
interface Pull {
  id: string;
  headRefOid: string;
  baseRefOid: string;
  files: { nodes: Array<{ path: string; viewerViewedState: string }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

export function githubViewed(ctx: GitHubContext, docs: DocRef[], head: string, base: string): NonNullable<ReviewSource['viewed']> {
  const endpoint = ctx.apiBase === 'https://api.github.com' ? `${ctx.apiBase}/graphql` : `${ctx.origin}/api/graphql`;
  let pullRequestId: string | null = null;
  const graphql = async <T>(query: string, variables: unknown): Promise<T> => {
    const token = await getToken(ctx.origin);
    if (!token) throw new ReaderError('Add a GitHub token to sync Viewed status.');
    try {
      const { data: result } = await getJson<{ data?: T; errors?: Array<{ message: string }> }>(endpoint, {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      if (result.errors?.length || !result.data) throw new ReaderError('GitHub could not sync Viewed status. Check your token and repository access, then try again.');
      return result.data;
    } catch (err) {
      if (err instanceof HttpError) throw new ReaderError(err.status === 0
        ? 'Could not confirm Viewed status. Check GitHub before trying again.'
        : 'GitHub could not sync Viewed status. Check your token and repository access, then try again.');
      throw err;
    }
  };
  const check = (pull: Pick<Pull, 'id' | 'headRefOid' | 'baseRefOid'> | null | undefined) => {
    if (!pull) throw new ReaderError('GitHub could not find this pull request.');
    if (pull.headRefOid !== head || pull.baseRefOid !== base) throw new ReaderError('This pull request changed while you were reading. Reopen the reader before marking files viewed.');
    pullRequestId = pull.id;
    return pull;
  };
  return {
    label: 'Viewed status synced with GitHub',
    async load() {
      const viewed: string[] = [];
      let after: string | null = null;
      for (let page = 0; page < 10; page++) {
        const data: { repository: { pullRequest: Pull | null } | null } = await graphql(FILES_QUERY, { owner: ctx.owner, repo: ctx.repo, number: ctx.number, after });
        const pull = check(data.repository?.pullRequest) as Pull;
        viewed.push(...pull.files.nodes.filter((file) => file.viewerViewedState === 'VIEWED').map((file) => file.path));
        if (!pull.files.pageInfo.hasNextPage) return viewed;
        after = pull.files.pageInfo.endCursor;
      }
      throw new ReaderError('GitHub could not load all Viewed statuses.');
    },
    async set(doc, viewed) {
      if (!docs.includes(doc)) throw new ReaderError('Choose a file from this pull request.');
      const data = await graphql<{ repository: { pullRequest: Pick<Pull, 'id' | 'headRefOid' | 'baseRefOid'> | null } | null }>(
        'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){id headRefOid baseRefOid}}}',
        { owner: ctx.owner, repo: ctx.repo, number: ctx.number },
      );
      check(data.repository?.pullRequest);
      const action = viewed ? 'markFileAsViewed' : 'unmarkFileAsViewed';
      const input = viewed ? 'MarkFileAsViewedInput' : 'UnmarkFileAsViewedInput';
      // Mutations are sent once, only after an explicit user click.
      await graphql(`mutation($input:${input}!){${action}(input:$input){pullRequest{id}}}`, { input: { pullRequestId, path: doc.path } });
    },
  };
}
