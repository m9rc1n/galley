/** Builds URLs for files in the repository at the revision being reviewed. */
export interface RepoLinks {
  /** URL that serves the raw file (images). */
  raw(path: string): string;
  /** URL that shows the file in the platform UI (links to other documents). */
  blob(path: string): string;
}

export type ResolvedHref = { type: 'anchor'; hash: string } | { type: 'external'; href: string } | { type: 'repo'; path: string; suffix: string };

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
  // Decode before resolving dot segments: `%2e%2e` and `%2F` must not survive as a later `../`,
  // which the browser would apply after encodePath and so leave the repository.
  for (const part of joined.split('/').flatMap((segment) => safeDecode(segment).split('/'))) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return { type: 'repo', path: out.join('/'), suffix: m[2] };
}

export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd|mdx)$/i.test(path);
}

/** Known text source/configuration files; never guess that an image or archive is code. */
export function isCodePath(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1);
  return (
    /\.(?:[cm]?jsx?|tsx?|py|rb|rake|go|rs|java|kt|kts|swift|m|mm|c|cc|cpp|cxx|h|hpp|cs|fs|fsx|php|vue|svelte|astro|html?|css|scss|sass|less|sh|bash|zsh|fish|ps1|bat|cmd|sql|graphql|gql|json|jsonc|ya?ml|toml|ini|conf|cfg|env|xml|svg|proto|ex|exs|erl|hrl|clj|cljs|cljc|edn|scala|sc|lua|r|dart|pl|pm|tf|hcl|nix|lock|txt|rst|adoc|asciidoc)$/i.test(
      name,
    ) ||
    /^(?:Dockerfile(?:\..+)?|Containerfile|Makefile|Gemfile|Rakefile|Procfile|Justfile|\.(?:gitignore|gitattributes|editorconfig|dockerignore|env(?:\..+)?))$/i.test(
      name,
    )
  );
}
