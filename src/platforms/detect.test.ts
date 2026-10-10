import { expect, it } from 'vitest';
import { detectContext, detectRepository, refCandidates } from './detect.ts';

it('GitHub pull requests are detected on any tab', () => {
  const doc = { title: 'Docs: reading-first reviews by octocat · Pull Request #128 · acme/handbook · GitHub' } as Document;
  const ctx = detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/pull/128/files' }, doc);
  expect(ctx).toMatchObject({ platform: 'github', apiBase: 'https://api.github.com', title: 'Docs: reading-first reviews', number: 128 });
  const enterprise = detectContext({ origin: 'https://git.acme.dev', pathname: '/acme/handbook/pull/7' });
  expect(enterprise).toMatchObject({ platform: 'github', apiBase: 'https://git.acme.dev/api/v3', title: 'Pull request #7' });
});

it('GitLab merge requests in nested groups and sub-path installs', () => {
  const doc = { body: { dataset: { projectFullPath: 'group/sub/project', projectId: '42' } } } as unknown as Document;
  const ctx = detectContext({ origin: 'https://git.acme.dev', pathname: '/gitlab/group/sub/project/-/merge_requests/7/diffs' }, doc);
  expect(ctx).toStrictEqual({
    platform: 'gitlab',
    key: 'gitlab:https://git.acme.dev/gitlab/group/sub/project!7',
    origin: 'https://git.acme.dev',
    prefix: '/gitlab',
    projectPath: 'group/sub/project',
    projectId: '42',
    iid: 7,
  });
  const plain = detectContext({ origin: 'https://gitlab.com', pathname: '/group/project/-/merge_requests/3' });
  expect(plain).toMatchObject({ platform: 'gitlab', projectPath: 'group/project', prefix: '' });
});

it('other pages are ignored', () => {
  expect(detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/issues/1' })).toBe(null);
  expect(detectContext({ origin: 'https://gitlab.com', pathname: '/group/project/-/merge_requests/new' })).toBe(null);
  expect(detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/pulls' })).toBe(null);
});

const gitlabProject = (projectFullPath: string, projectId?: string) =>
  ({ body: { dataset: { projectFullPath, page: 'projects:show', ...(projectId ? { projectId } : {}) } } }) as unknown as Document;

it('GitHub repositories, their folders and their Markdown files are starting points for reading docs', () => {
  const github = (pathname: string, origin = 'https://github.com') => detectRepository({ origin, pathname });
  expect(github('/acme/handbook')).toStrictEqual({
    platform: 'github',
    key: 'repo:github:https://github.com/acme/handbook/root/',
    repository: 'repo:github:https://github.com/acme/handbook',
    origin: 'https://github.com',
    apiBase: 'https://api.github.com',
    owner: 'acme',
    repo: 'handbook',
    view: 'root',
    rest: [],
  });
  expect(github('/acme/handbook.git/')).toMatchObject({ repo: 'handbook', view: 'root' });
  expect(github('/acme/handbook/tree/release/2.0/docs')).toMatchObject({ view: 'tree', rest: ['release', '2.0', 'docs'] });
  expect(github('/acme/handbook/blob/main/docs/Read%20me.md')).toMatchObject({ view: 'blob', rest: ['main', 'docs', 'Read me.md'] });
  expect(github('/acme/handbook/blob/main/bad%E0%A4%A.md')).toMatchObject({ rest: ['main', 'bad%E0%A4%A.md'] });
  expect(github('/acme/handbook', 'https://git.acme.dev')).toMatchObject({ apiBase: 'https://git.acme.dev/api/v3' });
});

it('GitHub pages that are not a repository, or not Markdown, are not starting points', () => {
  const github = (pathname: string) => detectRepository({ origin: 'https://github.com', pathname });
  expect(github('/settings/profile')).toBe(null);
  expect(github('/orgs/acme')).toBe(null);
  expect(github('/acme')).toBe(null);
  expect(github('/acme/handbook/issues')).toBe(null);
  expect(github('/acme/handbook/pull/3')).toBe(null);
  expect(github('/acme/handbook/blob/main/src/index.ts')).toBe(null);
  expect(github('/acme/handbook/blob/README.md')).toBe(null);
});

it('GitLab projects in nested groups and sub-path installs, from the page’s own project path', () => {
  const doc = gitlabProject('group/sub/project', '42');
  expect(detectRepository({ origin: 'https://git.acme.dev', pathname: '/gitlab/group/sub/project' }, doc)).toStrictEqual({
    platform: 'gitlab',
    key: 'repo:gitlab:https://git.acme.dev/gitlab/group/sub/project/root/',
    repository: 'repo:gitlab:https://git.acme.dev/gitlab/group/sub/project',
    origin: 'https://git.acme.dev',
    prefix: '/gitlab',
    projectPath: 'group/sub/project',
    projectId: '42',
    view: 'root',
    rest: [],
  });
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/group/project/-/tree/feature/x/docs/' }, gitlabProject('group/project'))).toMatchObject({
    prefix: '',
    projectId: null,
    view: 'tree',
    rest: ['feature', 'x', 'docs'],
  });
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/group/project/-/blob/main/docs/adr.md' }, gitlabProject('group/project'))).toMatchObject({
    view: 'blob',
    rest: ['main', 'docs', 'adr.md'],
  });
});

it('other GitLab pages are not starting points', () => {
  const project = gitlabProject('group/project');
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/group/project/-/issues' }, project)).toBe(null);
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/group/project/-/blob/main/app.rb' }, project)).toBe(null);
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/other/project' }, project)).toBe(null);
  const group = { body: { dataset: { page: 'groups:show' } } } as unknown as Document;
  expect(detectRepository({ origin: 'https://gitlab.com', pathname: '/group/sub' }, group)).toBe(null);
});

it('a ref with slashes is tried shortest first, and a file page always keeps its file', () => {
  expect(refCandidates({ view: 'root', rest: [] })).toStrictEqual([{ ref: null, path: '' }]);
  expect(refCandidates({ view: 'tree', rest: ['release', '2.0', 'docs'] })).toStrictEqual([
    { ref: 'release', path: '2.0/docs' },
    { ref: 'release/2.0', path: 'docs' },
    { ref: 'release/2.0/docs', path: '' },
  ]);
  expect(refCandidates({ view: 'blob', rest: ['main', 'a.md'] })).toStrictEqual([{ ref: 'main', path: 'a.md' }]);
  expect(refCandidates({ view: 'tree', rest: ['a', 'b', 'c', 'd', 'e', 'f'] })).toHaveLength(4);
});
