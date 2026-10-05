import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodePath, isMarkdownPath, resolveHref } from '../src/core/paths.ts';
import { detectContext } from '../src/platforms/detect.ts';

test('links and images resolve like on GitHub and GitLab', () => {
  assert.deepEqual(resolveHref('docs/rfcs/a.md', 'img/x.png'), { type: 'repo', path: 'docs/rfcs/img/x.png', suffix: '' });
  assert.deepEqual(resolveHref('docs/rfcs/a.md', '../adr/b.md#context'), { type: 'repo', path: 'docs/adr/b.md', suffix: '#context' });
  assert.deepEqual(resolveHref('docs/a.md', '/README.md'), { type: 'repo', path: 'README.md', suffix: '' });
  assert.deepEqual(resolveHref('README.md', './docs/My%20Doc.md?plain=1'), { type: 'repo', path: 'docs/My Doc.md', suffix: '?plain=1' });
  assert.deepEqual(resolveHref('a.md', 'https://example.dev/y'), { type: 'external', href: 'https://example.dev/y' });
  assert.deepEqual(resolveHref('a.md', 'mailto:team@example.dev'), { type: 'external', href: 'mailto:team@example.dev' });
  assert.deepEqual(resolveHref('a.md', '#intro'), { type: 'anchor', hash: 'intro' });
  assert.equal(encodePath('docs/My Doc #1.md'), 'docs/My%20Doc%20%231.md');
  assert.equal(isMarkdownPath('docs/guide.MD'), true);
  assert.equal(isMarkdownPath('src/index.ts'), false);
});

test('GitHub pull requests are detected on any tab', () => {
  const doc = { title: 'Docs: reading-first reviews by octocat · Pull Request #128 · acme/handbook · GitHub' } as Document;
  const ctx = detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/pull/128/files' }, doc);
  assert.ok(ctx && ctx.platform === 'github');
  assert.equal(ctx.apiBase, 'https://api.github.com');
  assert.equal(ctx.title, 'Docs: reading-first reviews');
  assert.equal(ctx.number, 128);
  const enterprise = detectContext({ origin: 'https://git.acme.dev', pathname: '/acme/handbook/pull/7' });
  assert.ok(enterprise && enterprise.platform === 'github');
  assert.equal(enterprise.apiBase, 'https://git.acme.dev/api/v3');
  assert.equal(enterprise.title, 'Pull request #7');
});

test('GitLab merge requests in nested groups and sub-path installs', () => {
  const doc = { body: { dataset: { projectFullPath: 'group/sub/project', projectId: '42' } } } as unknown as Document;
  const ctx = detectContext({ origin: 'https://git.acme.dev', pathname: '/gitlab/group/sub/project/-/merge_requests/7/diffs' }, doc);
  assert.deepEqual(ctx, {
    platform: 'gitlab',
    key: 'gitlab:https://git.acme.dev/gitlab/group/sub/project!7',
    origin: 'https://git.acme.dev',
    prefix: '/gitlab',
    projectPath: 'group/sub/project',
    projectId: '42',
    iid: 7,
  });
  const plain = detectContext({ origin: 'https://gitlab.com', pathname: '/group/project/-/merge_requests/3' });
  assert.ok(plain && plain.platform === 'gitlab');
  assert.equal(plain.projectPath, 'group/project');
  assert.equal(plain.prefix, '');
});

test('other pages are ignored', () => {
  assert.equal(detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/issues/1' }), null);
  assert.equal(detectContext({ origin: 'https://gitlab.com', pathname: '/group/project/-/merge_requests/new' }), null);
  assert.equal(detectContext({ origin: 'https://github.com', pathname: '/acme/handbook/pulls' }), null);
});
