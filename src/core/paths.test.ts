import { expect, it } from 'vitest';
import { encodePath, isCodePath, isMarkdownPath, resolveHref } from './paths.ts';

it('links and images resolve like on GitHub and GitLab', () => {
  expect(resolveHref('docs/rfcs/a.md', 'img/x.png')).toStrictEqual({ type: 'repo', path: 'docs/rfcs/img/x.png', suffix: '' });
  expect(resolveHref('docs/rfcs/a.md', '../adr/b.md#context')).toStrictEqual({ type: 'repo', path: 'docs/adr/b.md', suffix: '#context' });
  expect(resolveHref('docs/a.md', '/README.md')).toStrictEqual({ type: 'repo', path: 'README.md', suffix: '' });
  expect(resolveHref('README.md', './docs/My%20Doc.md?plain=1')).toStrictEqual({ type: 'repo', path: 'docs/My Doc.md', suffix: '?plain=1' });
  expect(resolveHref('a.md', 'https://example.dev/y')).toStrictEqual({ type: 'external', href: 'https://example.dev/y' });
  expect(resolveHref('a.md', 'mailto:team@example.dev')).toStrictEqual({ type: 'external', href: 'mailto:team@example.dev' });
  expect(resolveHref('a.md', '#intro')).toStrictEqual({ type: 'anchor', hash: 'intro' });
  expect(encodePath('docs/My Doc #1.md')).toBe('docs/My%20Doc%20%231.md');
  expect(isMarkdownPath('docs/guide.MD')).toBe(true);
  expect(isMarkdownPath('src/index.ts')).toBe(false);
  expect(isCodePath('src/__snapshots__/upload.test.ts.snap')).toBe(true);
});

it('encoded dot segments and slashes cannot climb out of the repository', () => {
  for (const href of ['%2e%2e/%2e%2e/%2E%2E/settings', '.%2e/.%2e/.%2e/settings', '..%2F..%2F..%2Fsettings', '/%2e%2e%2f%2e%2e%2fsettings']) {
    const resolved = resolveHref('docs/rfcs/a.md', href);
    expect(resolved, href).toStrictEqual({ type: 'repo', path: 'settings', suffix: '' });
  }
  expect(resolveHref('docs/a.md', '%252e%252e/x.md')).toStrictEqual({ type: 'repo', path: 'docs/%2e%2e/x.md', suffix: '' });
  // Whatever comes out, a browser cannot resolve it to anything outside the blob URL's folder.
  for (const href of ['%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/x', '%252e%252e/%2e./x', 'a/%2e/b/%2e%2e%2f%2e%2e%2f%2e%2e/x']) {
    const base = 'https://github.com/o/r/blob/sha/';
    const { path } = resolveHref('docs/a.md', href) as { path: string };
    expect(new URL(encodePath(path), base).href.startsWith(base), href).toBe(true);
  }
});

it('only known source/configuration paths are offered as code files', () => {
  for (const path of ['src/App.tsx', 'main.py', 'main.go', 'Dockerfile', '.env.local', '.gitignore', 'config.yaml', 'src/options.json'])
    expect(isCodePath(path), path).toBe(true);
  for (const path of ['image.png', 'movie.mp4', 'archive.zip', 'font.woff', 'README.md', 'unknown.blob']) expect(isCodePath(path), path).toBe(false);
});
