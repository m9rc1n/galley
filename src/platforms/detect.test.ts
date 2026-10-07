import { expect, it } from 'vitest';
import { detectContext } from './detect.ts';

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
