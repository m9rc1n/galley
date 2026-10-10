import { isMarkdownPath } from './paths.ts';

/** A file or folder from a platform's tree listing. */
export interface TreeEntry {
  path: string;
  type: string;
  /** GitHub's id for a folder, used to list it on its own. */
  sha?: string;
  size?: number;
}

/** A Markdown document found in a repository listing. */
export interface RepoDoc {
  path: string;
  /** Bytes, when the listing says; oversized documents are left out of the map without reading them. */
  size?: number;
}

export interface RepoDiscovery {
  /** By path, so revisiting a repository shows the same order. */
  docs: RepoDoc[];
  /** What the listing could not cover, in plain words. Empty when the whole repository was listed. */
  limits: string[];
}

/**
 * Folders where projects tend to keep specs, decisions and guides. They are listed first when a
 * repository is too large to list in full. A hint, not a convention: Markdown anywhere is found.
 */
export const DOC_ROOTS = [
  'docs',
  'doc',
  'documentation',
  'specs',
  'spec',
  'adr',
  'adrs',
  'decisions',
  'rfcs',
  'rfc',
  'design',
  'architecture',
  'runbooks',
  'handbook',
  'guides',
];
/** Most documents listed for one repository; beyond this the list says how many were left out. */
export const MAX_DOCS = 2_000;
/** Most documentation folders listed one by one when the whole tree was too large. */
export const MAX_DOC_ROOTS = 6;

/** Dependencies and their READMEs, copied into a repository: listed last, and first to be left out. */
const VENDORED = /(?:^|\/)(?:node_modules|vendor|third[_-]party|bower_components)\//i;

/** Top-level documentation folders, in DOC_ROOTS order, at most MAX_DOC_ROOTS. */
export function docRoots(root: TreeEntry[]): TreeEntry[] {
  const folders = root.filter((entry) => entry.type === 'tree' && !entry.path.includes('/'));
  return DOC_ROOTS.flatMap((name) => folders.filter((entry) => entry.path.toLowerCase() === name)).slice(0, MAX_DOC_ROOTS);
}

function rank(path: string): number {
  if (VENDORED.test(path)) return 3;
  if (!path.includes('/')) return 0;
  return DOC_ROOTS.includes(path.slice(0, path.indexOf('/')).toLowerCase()) ? 1 : 2;
}

const byPath = (a: RepoDoc, b: RepoDoc) => (a.path < b.path ? -1 : 1);

/** The Markdown documents in a listing. Past MAX_DOCS, documentation folders are kept before the rest. */
export function collectDocs(entries: TreeEntry[], limits: string[]): RepoDiscovery {
  const found = new Map<string, RepoDoc>();
  for (const entry of entries) {
    if (entry.type !== 'blob' || !isMarkdownPath(entry.path) || found.has(entry.path)) continue;
    found.set(entry.path, entry.size === undefined ? { path: entry.path } : { path: entry.path, size: entry.size });
  }
  let docs = [...found.values()];
  if (docs.length > MAX_DOCS) {
    limits.push(`Listing the first ${MAX_DOCS.toLocaleString('en')} of ${docs.length.toLocaleString('en')} Markdown files, documentation folders first.`);
    docs = docs.sort((a, b) => rank(a.path) - rank(b.path) || byPath(a, b)).slice(0, MAX_DOCS);
  }
  return { docs: docs.sort(byPath), limits };
}
