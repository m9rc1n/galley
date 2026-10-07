// GraphQL operations Galley sends to GitHub. The background worker accepts only these.

export const VIEWED_FILES_QUERY = `query($owner:String!,$repo:String!,$number:Int!,$after:String) {
  repository(owner:$owner,name:$repo) { pullRequest(number:$number) {
    id headRefOid baseRefOid files(first:100,after:$after) {
      nodes { path viewerViewedState } pageInfo { hasNextPage endCursor }
    }
  } }
}`;

export const PULL_SNAPSHOT_QUERY =
  'query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){id headRefOid baseRefOid}}}';

export const MARK_VIEWED = 'mutation($input:MarkFileAsViewedInput!){markFileAsViewed(input:$input){pullRequest{id}}}';
export const UNMARK_VIEWED = 'mutation($input:UnmarkFileAsViewedInput!){unmarkFileAsViewed(input:$input){pullRequest{id}}}';

export const GRAPHQL_OPERATIONS = [VIEWED_FILES_QUERY, PULL_SNAPSHOT_QUERY, MARK_VIEWED, UNMARK_VIEWED];
