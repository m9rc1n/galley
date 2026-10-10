import { expect, it } from 'vitest';
import { jsonResponse, mockFetch } from '../testing/http.ts';
import type { GitLabRepoContext } from './detect.ts';
import { loadGitLabRepository } from './gitlab-repo.ts';

const api = 'https://git.acme.dev/gitlab/api/v4/projects/group%2Fsub%2Fproject';
const context = (view: GitLabRepoContext['view'], rest: string[] = [], projectId: string | null = null): GitLabRepoContext => ({
  platform: 'gitlab',
  key: 'k',
  repository: 'r',
  origin: 'https://git.acme.dev',
  prefix: '/gitlab',
  projectPath: 'group/sub/project',
  projectId,
  view,
  rest,
});
const page = (data: unknown, next = '') => new Response(JSON.stringify(data), { headers: { 'x-next-page': next } });
const blob = (path: string) => ({ path, type: 'blob' });

it('a project page reads the default branch at one commit with the browser session', async () => {
  const seen: Array<{ url: string; credentials?: RequestCredentials }> = [];
  mockFetch((url, init) => {
    seen.push({ url, credentials: init?.credentials });
    if (url === `${api}/repository/commits/HEAD`) return jsonResponse({ id: 'c1' });
    if (url === `${api}/repository/tree?recursive=true&per_page=100&ref=c1&page=1`) return page([blob('README.md'), blob('docs/a.md')], '2');
    if (url === `${api}/repository/tree?recursive=true&per_page=100&ref=c1&page=2`) return page([blob('docs/b.md'), blob('app.rb'), blob('.gitlab-ci.yml')]);
    if (url === `${api}/repository/files/docs%2Fa.md/raw?ref=c1`) return new Response('# A');
    return new Response('', { status: 500 });
  });
  const source = await loadGitLabRepository(context('root'));
  expect(source).toMatchObject({
    platform: 'GitLab',
    id: 'gitlab:https://git.acme.dev/gitlab/group/sub/project',
    name: 'group/sub/project',
    ref: null,
    commit: 'c1',
    pinned: false,
    start: { path: '', folder: true },
  });
  expect(source.newIssue('Notes', 'Body')).toBe(
    'https://git.acme.dev/gitlab/group/sub/project/-/issues/new?issue%5Btitle%5D=Notes&issue%5Bdescription%5D=Body',
  );
  expect(source.url).toBe('https://git.acme.dev/gitlab/group/sub/project/-/tree/c1');
  expect(await source.discover()).toStrictEqual({
    docs: [{ path: 'README.md' }, { path: 'docs/a.md' }, { path: 'docs/b.md' }],
    limits: [],
    configs: { files: [{ path: '.gitlab-ci.yml' }], limits: [] },
  });
  expect(await source.load('docs/a.md')).toBe('# A');
  expect(source.links.raw('img/a b.png')).toBe('https://git.acme.dev/gitlab/group/sub/project/-/raw/c1/img/a%20b.png');
  expect(source.links.blob('docs/a.md')).toBe('https://git.acme.dev/gitlab/group/sub/project/-/blob/c1/docs/a.md');
  expect(seen.every((request) => request.credentials === 'same-origin')).toBe(true);
  expect((await source.refresh()).commit).toBe('c1');
});

it('a branch with slashes is found by trying the shortest ref first, by project id when the page has one', async () => {
  const byId = 'https://git.acme.dev/gitlab/api/v4/projects/42';
  mockFetch((url) => {
    if (url === `${byId}/repository/commits/feature`) return jsonResponse({ message: '404 Commit Not Found' }, 404);
    if (url === `${byId}/repository/commits/feature%2Fx`) return jsonResponse({ id: 'c7' });
    return new Response('', { status: 500 });
  });
  const file = await loadGitLabRepository(context('blob', ['feature', 'x', 'docs', 'adr.md'], '42'));
  expect(file).toMatchObject({ ref: 'feature/x', commit: 'c7', start: { path: 'docs/adr.md', folder: false } });
});

it('a project larger than the listing budget is listed again by documentation folder', async () => {
  mockFetch((url) => {
    if (url.includes('/repository/commits/')) return jsonResponse({ id: 'c1' });
    const query = new URL(url).searchParams;
    if (!query.get('path') && query.get('recursive')) return page([blob('lib/README.md')], 'more');
    if (!query.get('path')) return page([blob('README.md'), { path: 'docs', type: 'tree' }, { path: 'adr', type: 'tree' }, { path: 'deploy', type: 'tree' }]);
    if (query.get('path') === 'docs') return page([blob('docs/guide.md')], 'more');
    if (query.get('path') === 'deploy') return page([blob('deploy/api.yaml')], 'more');
    return page([blob('adr/0001.md')]);
  });
  const source = await loadGitLabRepository(context('root'));
  expect(await source.discover()).toStrictEqual({
    docs: [{ path: 'README.md' }, { path: 'adr/0001.md' }, { path: 'docs/guide.md' }, { path: 'lib/README.md' }],
    limits: [
      'This repository has more files than Galley lists at once. docs/, adr/ are listed separately; other documents may be missing.',
      'Only part of docs/ is listed.',
    ],
    configs: {
      files: [{ path: 'deploy/api.yaml' }],
      limits: ['Only configuration at the top level and deploy/ is listed; other files may be missing.', 'Only part of deploy/ is listed.'],
    },
  });
  mockFetch((url) => {
    if (url.includes('/repository/commits/')) return jsonResponse({ id: 'c1' });
    const query = new URL(url).searchParams;
    if (!query.get('path') && query.get('recursive')) return page([], 'more');
    if (!query.get('path')) return page([{ path: 'docs', type: 'tree' }]);
    return page([blob('docs/a.md')]);
  });
  expect((await (await loadGitLabRepository(context('root'))).discover()).limits).toStrictEqual([
    'This repository has more files than Galley lists at once. docs/ is listed separately; other documents may be missing.',
  ]);
  mockFetch((url) => (url.includes('/repository/commits/') ? jsonResponse({ id: 'c1' }) : page([], url.includes('recursive') ? 'more' : '')));
  expect((await (await loadGitLabRepository(context('root'))).discover()).limits).toStrictEqual([
    'This repository has more files than Galley lists at once. other documents may be missing.',
  ]);
});

it('explains a project, branch or document that cannot be read', async () => {
  mockFetch(() => jsonResponse({ message: '404 Commit Not Found' }, 404));
  await expect(loadGitLabRepository(context('root'))).rejects.toMatchObject({
    message: 'GitLab did not return this project.',
    hint: 'Make sure you are signed in and can see this project, and that it has commits.',
  });
  await expect(loadGitLabRepository(context('tree', ['nope']))).rejects.toThrow('GitLab could not find this branch or tag.');
  const failures: Array<[number, string]> = [
    [401, 'GitLab did not return this project.'],
    [429, 'GitLab rate limit reached.'],
    [0, 'Could not reach GitLab.'],
    [502, 'GitLab returned an error (502).'],
  ];
  for (const [status, message] of failures) {
    mockFetch(() => (status ? new Response('', { status }) : Promise.reject(new TypeError('offline'))));
    await expect(loadGitLabRepository(context('root'))).rejects.toThrow(message);
  }
  mockFetch(() => new Response('<html>'));
  await expect(loadGitLabRepository(context('root'))).rejects.toThrow(SyntaxError);

  mockFetch((url) => {
    if (url.includes('/repository/commits/')) return jsonResponse({ id: 'c1' });
    if (url.includes('gone.md')) return new Response('', { status: 404 });
    return new Response('', { status: 403 });
  });
  const source = await loadGitLabRepository(context('root'));
  await expect(source.load('gone.md')).rejects.toThrow('This document is not in the repository at this commit.');
  await expect(source.load('locked.md')).rejects.toThrow('GitLab did not return this project.');
  await expect(source.discover()).rejects.toThrow('GitLab did not return this project.');
});

it('a commit page is pinned: there is nothing newer to read', async () => {
  mockFetch(() => jsonResponse({ id: 'abc1234def' }));
  const source = await loadGitLabRepository(context('tree', ['abc1234']));
  expect(source).toMatchObject({ ref: 'abc1234', commit: 'abc1234def', pinned: true });
});
