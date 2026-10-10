import { expect, it } from 'vitest';
import { jsonResponse, mockFetch } from '../testing/http.ts';
import type { GitHubRepoContext } from './detect.ts';
import { directApi } from './github-api.ts';
import { loadGitHubRepository } from './github-repo.ts';
import { getToken, setToken } from './tokens.ts';

const api = 'https://api.github.com/repos/acme/handbook';
const context = (view: GitHubRepoContext['view'], rest: string[] = []): GitHubRepoContext => ({
  platform: 'github',
  key: 'k',
  repository: 'r',
  origin: 'https://github.com',
  apiBase: 'https://api.github.com',
  owner: 'acme',
  repo: 'handbook',
  view,
  rest,
});
const load = (ctx: GitHubRepoContext) => loadGitHubRepository(ctx, directApi('https://github.com', getToken));
const blob = (path: string, size?: number) => ({ path, type: 'blob', ...(size === undefined ? {} : { size }) });

it('a repository page reads the default branch at one commit, listing its Markdown and reading files same-origin', async () => {
  const seen: string[] = [];
  let head = 'c1';
  mockFetch((url) => {
    seen.push(url);
    if (url === `${api}/commits?per_page=1`) return jsonResponse([{ sha: head }]);
    if (url === `${api}/git/trees/c1?recursive=1`)
      return jsonResponse({
        tree: [blob('README.md', 120), { path: 'docs', type: 'tree' }, blob('docs/adr/0001-use-markdown.md'), blob('src/app.ts')],
        truncated: false,
      });
    if (url === 'https://github.com/acme/handbook/raw/c1/docs/adr/0001-use-markdown.md') return new Response('# Use Markdown');
    return new Response('', { status: 500 });
  });
  const source = await load(context('root'));
  expect(source).toMatchObject({ platform: 'GitHub', name: 'acme/handbook', ref: null, commit: 'c1', start: { path: '', folder: true } });
  expect(source.url).toBe('https://github.com/acme/handbook/tree/c1');
  expect(await source.discover()).toStrictEqual({ docs: [{ path: 'README.md', size: 120 }, { path: 'docs/adr/0001-use-markdown.md' }], limits: [] });
  expect(await source.load('docs/adr/0001-use-markdown.md')).toBe('# Use Markdown');
  expect(source.links.raw('img/a b.png')).toBe('https://github.com/acme/handbook/raw/c1/img/a%20b.png');
  expect(source.links.blob('docs/x.md')).toBe('https://github.com/acme/handbook/blob/c1/docs/x.md');
  // Refreshing resolves the branch again: a new snapshot when it has moved.
  head = 'c2';
  expect((await source.refresh()).commit).toBe('c2');
  expect(seen.filter((url) => url.startsWith(api))).toStrictEqual([
    `${api}/commits?per_page=1`,
    `${api}/git/trees/c1?recursive=1`,
    `${api}/commits?per_page=1`,
  ]);
});

it('a branch with slashes is found by trying the shortest ref first', async () => {
  const tried: string[] = [];
  mockFetch((url) => {
    tried.push(url);
    if (url === `${api}/commits?sha=release&per_page=1`) return jsonResponse({ message: 'Not Found' }, 404);
    if (url === `${api}/commits?sha=release%2F2.0&per_page=1`) return jsonResponse([{ sha: 'c9' }]);
    return jsonResponse({}, 500);
  });
  const folder = await load(context('tree', ['release', '2.0', 'docs', 'adr']));
  expect(folder).toMatchObject({ ref: 'release/2.0', commit: 'c9', start: { path: 'docs/adr', folder: true } });
  expect(tried).toHaveLength(2);
  mockFetch((url) => (url.includes('sha=main&') ? jsonResponse({ message: 'No commit found' }, 422) : jsonResponse([{ sha: 'c3' }])));
  const file = await load(context('blob', ['main', 'v2', 'docs', 'guide.md']));
  expect(file).toMatchObject({ ref: 'main/v2', start: { path: 'docs/guide.md', folder: false } });
});

it('a tree too large for one listing is listed again by documentation folder, and says what may be missing', async () => {
  mockFetch((url) => {
    if (url.includes('/commits?')) return jsonResponse([{ sha: 'c1' }]);
    if (url === `${api}/git/trees/c1?recursive=1`) return jsonResponse({ tree: [blob('lib/a/README.md')], truncated: true });
    if (url === `${api}/git/trees/c1`)
      return jsonResponse({
        tree: [
          blob('README.md'),
          { path: 'docs', type: 'tree', sha: 't-docs' },
          { path: 'adr', type: 'tree', sha: 't-adr' },
          { path: 'lib', type: 'tree', sha: 't-lib' },
        ],
        truncated: false,
      });
    if (url === `${api}/git/trees/t-docs?recursive=1`) return jsonResponse({ tree: [blob('guide.md'), { path: 'img', type: 'tree' }], truncated: true });
    if (url === `${api}/git/trees/t-adr?recursive=1`) return jsonResponse({ tree: [blob('0001.md')], truncated: false });
    return jsonResponse({}, 500);
  });
  const source = await load(context('root'));
  expect(await source.discover()).toStrictEqual({
    docs: [{ path: 'README.md' }, { path: 'adr/0001.md' }, { path: 'docs/guide.md' }, { path: 'lib/a/README.md' }],
    limits: [
      'This repository is too large for GitHub to list in one go. Top-level files and docs/, adr/ are listed in full; other documents may be missing.',
      'GitHub listed only part of docs/.',
    ],
  });
  mockFetch((url) => {
    if (url.includes('/commits?')) return jsonResponse([{ sha: 'c1' }]);
    return jsonResponse({ tree: [blob('README.md')], truncated: url.endsWith('recursive=1') });
  });
  const plain = await load(context('root'));
  expect((await plain.discover()).limits).toStrictEqual(['This repository is too large for GitHub to list in one go. other documents may be missing.']);
});

it('explains a repository, branch or document that cannot be read, with or without a token', async () => {
  mockFetch(() => jsonResponse({ message: 'Not Found' }, 404));
  await expect(load(context('root'))).rejects.toMatchObject({
    message: 'GitHub could not find this repository.',
    hint: 'If the repository is private, add a read-only GitHub token in the Galley toolbar popup.',
    needsToken: true,
  });
  await expect(load(context('tree', ['nope']))).rejects.toThrow('GitHub could not find this branch or tag.');
  mockFetch(() => jsonResponse({ message: 'Git Repository is empty.' }, 409));
  await expect(load(context('root'))).rejects.toThrow('This repository has no commits yet.');
  mockFetch(() => jsonResponse({ message: 'Bad credentials' }, 401));
  await expect(load(context('root'))).rejects.toThrow('GitHub rejected the token.');
  mockFetch(() => new Response('<html>', { status: 200 }));
  await expect(load(context('root'))).rejects.toThrow(SyntaxError);

  await setToken('https://github.com', 'read-token');
  mockFetch((url) => {
    if (url.includes('/commits?')) return jsonResponse([{ sha: 'c1' }]);
    if (url.includes('/raw/c1/gone.md')) return new Response('', { status: 404 });
    if (url.includes('/raw/c1/locked.md')) return new Response('', { status: 403 });
    return jsonResponse({ message: 'Not Found' }, 404);
  });
  const source = await load(context('root'));
  await expect(source.discover()).rejects.toMatchObject({
    message: 'GitHub could not find this repository.',
    hint: 'Make sure your token can read this repository (Contents: read-only).',
    needsToken: false,
  });
  await expect(source.load('gone.md')).rejects.toThrow('This document is not in the repository at this commit.');
  await expect(source.load('locked.md')).rejects.toThrow('GitHub returned an error (403).');
});
