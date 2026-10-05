/** Builds URLs for files in the repository at the revision being reviewed. */
export interface RepoLinks {
  /** URL that serves the raw file (images). */
  raw(path: string): string;
  /** URL that shows the file in the platform UI (links to other documents). */
  blob(path: string): string;
}

export type ResolvedHref =
  | { type: 'anchor'; hash: string }
  | { type: 'external'; href: string }
  | { type: 'repo'; path: string; suffix: string };

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Resolve a link or image reference found in `docPath` the way GitHub and GitLab do:
 * relative to the document's folder, or to the repository root when it starts with `/`.
 */
export function resolveHref(docPath: string, href: string): ResolvedHref {
  if (href.startsWith('#')) return { type: 'anchor', hash: safeDecode(href.slice(1)) };
  if (SCHEME.test(href) || href.startsWith('//')) return { type: 'external', href };
  const m = /^([^?#]*)(.*)$/.exec(href)!;
  const dir = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : '';
  const joined = m[1].startsWith('/') ? m[1].slice(1) : dir ? `${dir}/${m[1]}` : m[1];
  const out: string[] = [];
  for (const part of joined.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(safeDecode(part));
  }
  return { type: 'repo', path: out.join('/'), suffix: m[2] };
}

export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd|mdx)$/i.test(path);
}
